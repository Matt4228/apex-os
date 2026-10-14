"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { parseDateOnly, toDateInputValue } from "@/lib/dates"
import { REPEATS, addDays, seriesDays } from "@/lib/occurrences"
import { timeToMinutes } from "@/lib/schedule-time"

// 00:00 to 23:59. End times may also be 24:00, which is where a block dragged to the bottom of the grid ends.
const START_TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const END_TIME = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const blockSchema = z
    .object({
        label: z.string().min(1, "Give the block a label"),
        category: z.string().optional(),
        startDate: z.string().regex(DATE, "Pick a date"),
        startTime: z.string().regex(START_TIME, "Start time must be HH:MM"),
        endTime: z.string().regex(END_TIME, "End time must be HH:MM"),
        repeat: z.enum(REPEATS, { error: "Pick how it repeats" }),
        // "1,3" from the form: the weekdays a weekly block happens on
        repeatDays: z
            .string()
            .regex(/^([0-6](,[0-6])*)?$/, "Pick days of the week")
            .transform(value => (value ? [...new Set(value.split(",").map(Number))].sort() : [])),
        ends: z.enum(["never", "on", "after"]),
        endsOn: z.string().optional(),
        endsAfter: z.string().optional(),
    })
    .refine(b => timeToMinutes(b.endTime) > timeToMinutes(b.startTime), {
        error: "End time must be after start time",
        path: ["endTime"],
    })
    .refine(b => b.repeat !== "weekly" || b.repeatDays.length > 0, {
        error: "Pick at least one day for it to repeat on",
        path: ["repeatDays"],
    })
    .refine(b => b.repeat === "none" || b.ends !== "on" || (DATE.test(b.endsOn ?? "") && b.endsOn! >= b.startDate), {
        error: "The end date can't be before the start date",
        path: ["endsOn"],
    })
    .refine(b => b.repeat === "none" || b.ends !== "after" || /^[1-9]\d{0,3}$/.test(b.endsAfter ?? ""), {
        error: "It has to happen at least once",
        path: ["endsAfter"],
    })

/** The form, checked, as the database columns. Fields that don't apply to the repeat are cleared */
function readBlockForm(formData: FormData) {
    const text = (key: string) => {
        const value = formData.get(key)
        return value === null ? undefined : String(value)
    }
    const parsed = blockSchema.safeParse({
        label: text("label") ?? "",
        category: text("category") || undefined,
        startDate: text("startDate") ?? "",
        startTime: text("startTime") ?? "",
        endTime: text("endTime") ?? "",
        repeat: text("repeat") ?? "none",
        repeatDays: text("repeatDays") ?? "",
        ends: text("ends") ?? "never",
        endsOn: text("endsOn") || undefined,
        endsAfter: text("endsAfter") || undefined,
    })
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const b = parsed.data
    const repeats = b.repeat !== "none"
    return {
        data: {
            label: b.label,
            category: b.category || null,
            startDate: parseDateOnly(b.startDate),
            startTime: b.startTime,
            endTime: b.endTime,
            repeat: b.repeat,
            repeatDays: b.repeat === "weekly" ? b.repeatDays : [],
            endsOn: repeats && b.ends === "on" ? parseDateOnly(b.endsOn!) : null,
            endsAfter: repeats && b.ends === "after" ? Number(b.endsAfter) : null,
        },
    }
}

export async function createScheduleBlock(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const form = readBlockForm(formData)
    if ("error" in form) return { error: form.error }

    const block = await prisma.scheduleBlock.create({ data: { ...form.data, userId: session.user.id } })
    return { block, exceptions: [] }
}

/** Which days of a repeating block a change applies to, counted from the day it was made on */
export type Scope = "this" | "following" | "all"
const targetSchema = z.object({ date: z.string().regex(DATE), scope: z.enum(["this", "following", "all"]) })

type Block = NonNullable<Awaited<ReturnType<typeof prisma.scheduleBlock.findFirst>>>
type BlockData = Extract<ReturnType<typeof readBlockForm>, { data: unknown }>["data"]

/** Is this one of the series' own days (before any changes)? */
const happensOn = (block: Block, day: string) => seriesDays({ ...block }, day).includes(day)

/**
 * Saves a block. A one-off block, or a call without a target, changes the whole block. For a repeating block,
 * `target` says which day the form was opened on and how far the change reaches:
 * - "this": only that day, as a changed day (it can move to another date, but not onto a day the block already has)
 * - "following": the series ends the day before, and a new series with the form's fields takes over from there
 * - "all": every day; the series keeps its own start date, since the form shows the day it was opened on
 *
 * Changing the whole series keeps changed days, unless the new rule no longer lands on their day: those are deleted,
 * since they would point at a day that doesn't exist. Returns the block and its changed days, plus the new series
 * when "following" split it
 */
export async function updateScheduleBlock(blockId: string, formData: FormData, target?: { date: string; scope: Scope }) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const form = readBlockForm(formData)
    if ("error" in form) return { error: form.error }
    if (target && !targetSchema.safeParse(target).success) return { error: "Invalid input" }

    const owned = await prisma.scheduleBlock.findFirst({ where: { id: blockId, userId: session.user.id } })
    if (!owned) return { error: "Not found" }

    if (target && owned.repeat !== "none") {
        if (!happensOn(owned, target.date)) return { error: "That day isn't part of this block" }
        if (target.scope === "this") return changeOneDay(owned, target.date, form.data)
        if (target.scope === "following" && target.date !== toDateInputValue(owned.startDate)) {
            return splitFrom(owned, target.date, form.data, session.user.id)
        }
    }

    const data = target && owned.repeat !== "none" ? { ...form.data, startDate: owned.startDate } : form.data
    const block = await prisma.scheduleBlock.update({ where: { id: blockId }, data })

    const exceptions = await prisma.blockException.findMany({ where: { blockId } })
    const latest = exceptions.reduce((max, e) => (toDateInputValue(e.date) > max ? toDateInputValue(e.date) : max), "")
    const stillThere = new Set(latest ? seriesDays({ ...block, id: blockId }, latest) : [])
    const orphaned = exceptions.filter(e => !stillThere.has(toDateInputValue(e.date)))
    if (orphaned.length > 0) {
        await prisma.blockException.deleteMany({ where: { id: { in: orphaned.map(e => e.id) } } })
    }

    return { block, exceptions: exceptions.filter(e => stillThere.has(toDateInputValue(e.date))) }
}

/**
 * One day of a series, changed on its own. Fields that match the series are stored as null, so a later change to the
 * whole series still reaches them; a change that matches the series everywhere removes the changed day altogether
 */
async function changeOneDay(block: Block, date: string, data: BlockData) {
    const newDay = toDateInputValue(data.startDate)
    const moved = newDay !== date
    if (moved && happensOn(block, newDay)) return { error: "This block already happens on that day" }

    const unlessSame = <T>(value: T, base: T) => (value === base ? null : value)
    const fields = {
        newDate: moved ? data.startDate : null,
        startTime: unlessSame(data.startTime, block.startTime),
        endTime: unlessSame(data.endTime, block.endTime),
        label: unlessSame(data.label, block.label),
        category: unlessSame(data.category, block.category),
    }
    const where = { blockId_date: { blockId: block.id, date: parseDateOnly(date) } }

    if (Object.values(fields).every(value => value === null)) {
        await prisma.blockException.deleteMany({ where: { blockId: block.id, date: parseDateOnly(date) } })
    } else {
        await prisma.blockException.upsert({
            where,
            create: { blockId: block.id, date: parseDateOnly(date), cancelled: false, ...fields },
            update: { cancelled: false, ...fields },
        })
    }

    return { block, exceptions: await prisma.blockException.findMany({ where: { blockId: block.id } }) }
}

/**
 * "This and following": the old series ends the day before `date` (a count becomes that end date), and a new series
 * with the form's fields starts on the form's date. Changed days from `date` on belong to the old version, so they
 * go; tasks planned in the block from `date` on move to the new series, so they stay in their block
 */
async function splitFrom(block: Block, date: string, data: BlockData, userId: string) {
    const from = parseDateOnly(date)
    return prisma.$transaction(async tx => {
        const ended = await tx.scheduleBlock.update({
            where: { id: block.id },
            data: { endsOn: parseDateOnly(addDays(date, -1)), endsAfter: null },
        })
        const created = await tx.scheduleBlock.create({ data: { ...data, userId } })
        await tx.blockException.deleteMany({ where: { blockId: block.id, date: { gte: from } } })
        await tx.task.updateMany({
            where: { scheduleBlockId: block.id, plannedFor: { gte: from } },
            data: { scheduleBlockId: created.id },
        })
        const exceptions = await tx.blockException.findMany({ where: { blockId: block.id } })
        return { block: ended, exceptions, created: { block: created, exceptions: [] } }
    })
}

/**
 * Removes days of a repeating block. "this": that day is cancelled. "following": the series ends the day before
 * (from its first day, that's the whole block). Tasks planned in it on removed days go back to anytime.
 * Deleting the whole block is deleteScheduleBlock, which the undo toast uses
 */
export async function removeBlockDays(blockId: string, date: string, scope: "this" | "following") {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    if (!targetSchema.safeParse({ date, scope }).success || scope === ("all" as string)) return { error: "Invalid input" }

    const owned = await prisma.scheduleBlock.findFirst({ where: { id: blockId, userId: session.user.id } })
    if (!owned) return { error: "Not found" }
    if (!happensOn(owned, date)) return { error: "That day isn't part of this block" }

    const day = parseDateOnly(date)
    if (scope === "this") {
        const cleared = { newDate: null, startTime: null, endTime: null, label: null, category: null }
        await prisma.blockException.upsert({
            where: { blockId_date: { blockId, date: day } },
            create: { blockId, date: day, cancelled: true, ...cleared },
            update: { cancelled: true, ...cleared },
        })
        await prisma.task.updateMany({ where: { scheduleBlockId: blockId, plannedFor: day }, data: { scheduleBlockId: null } })
        return { block: owned, exceptions: await prisma.blockException.findMany({ where: { blockId } }) }
    }

    if (date === toDateInputValue(owned.startDate)) {
        await prisma.scheduleBlock.delete({ where: { id: blockId } })
        return { deleted: true as const }
    }

    return prisma.$transaction(async tx => {
        const block = await tx.scheduleBlock.update({
            where: { id: blockId },
            data: { endsOn: parseDateOnly(addDays(date, -1)), endsAfter: null },
        })
        await tx.blockException.deleteMany({ where: { blockId, date: { gte: day } } })
        await tx.task.updateMany({ where: { scheduleBlockId: blockId, plannedFor: { gte: day } }, data: { scheduleBlockId: null } })
        return { block, exceptions: await tx.blockException.findMany({ where: { blockId } }) }
    })
}

export async function deleteScheduleBlock(blockId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await prisma.scheduleBlock.delete({
        where: { id: blockId, userId: session.user.id },
    })
}
