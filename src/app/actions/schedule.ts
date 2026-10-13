"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { parseDateOnly, toDateInputValue } from "@/lib/dates"
import { REPEATS, seriesDays } from "@/lib/occurrences"
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

/**
 * Changes the whole series. Changed days keep their own changes, unless the new rule no longer lands on their day:
 * those are deleted, since they would point at a day that doesn't exist. Returns the block's remaining exceptions
 */
export async function updateScheduleBlock(blockId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const form = readBlockForm(formData)
    if ("error" in form) return { error: form.error }

    const owned = await prisma.scheduleBlock.findFirst({ where: { id: blockId, userId: session.user.id } })
    if (!owned) return { error: "Not found" }

    const block = await prisma.scheduleBlock.update({ where: { id: blockId }, data: form.data })

    const exceptions = await prisma.blockException.findMany({ where: { blockId } })
    const latest = exceptions.reduce((max, e) => (toDateInputValue(e.date) > max ? toDateInputValue(e.date) : max), "")
    const stillThere = new Set(latest ? seriesDays({ ...block, id: blockId }, latest) : [])
    const orphaned = exceptions.filter(e => !stillThere.has(toDateInputValue(e.date)))
    if (orphaned.length > 0) {
        await prisma.blockException.deleteMany({ where: { id: { in: orphaned.map(e => e.id) } } })
    }

    return { block, exceptions: exceptions.filter(e => stillThere.has(toDateInputValue(e.date))) }
}

export async function deleteScheduleBlock(blockId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await prisma.scheduleBlock.delete({
        where: { id: blockId, userId: session.user.id },
    })
}
