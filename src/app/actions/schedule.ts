"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { timeToMinutes } from "@/lib/schedule-time"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

// 00:00 to 23:59. End times may also be 24:00, which is where a block dragged to the bottom of the grid ends.
const START_TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const END_TIME = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/

const blockSchema = z
    .object({
        dayOfWeek: z.enum(DAYS, { error: "Pick a day of the week" }),
        startTime: z.string().regex(START_TIME, "Start time must be HH:MM"),
        endTime: z.string().regex(END_TIME, "End time must be HH:MM"),
        label: z.string().min(1, "Give the block a label"),
        category: z.string().optional(),
        color: z.string().optional(),
    })
    .refine(b => timeToMinutes(b.endTime) > timeToMinutes(b.startTime), {
        error: "End time must be after start time",
        path: ["endTime"],
    })

export async function createScheduleBlock(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const parsed = blockSchema.safeParse({
        dayOfWeek: String(formData.get("dayOfWeek")),
        startTime: String(formData.get("startTime")),
        endTime: String(formData.get("endTime")),
        label: String(formData.get("label")),
        category: formData.get("category") ? String(formData.get("category")) : undefined,
        color: formData.get("color") ? String(formData.get("color")) : undefined,
    })

    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const lastBlock = await prisma.scheduleBlock.findFirst({
        where: { userId: session.user.id, dayOfWeek: parsed.data.dayOfWeek },
        orderBy: { sortOrder: "desc" },
    })

    const block = await prisma.scheduleBlock.create({
        data: {
            userId: session.user.id,
            dayOfWeek: parsed.data.dayOfWeek,
            startTime: parsed.data.startTime,
            endTime: parsed.data.endTime,
            label: parsed.data.label,
            category: parsed.data.category || null,
            color: parsed.data.color || "#2E294E",
            sortOrder: (lastBlock?.sortOrder ?? -1) + 1,
        },
    })

    return { block }
}

export async function deleteScheduleBlock(blockId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await prisma.scheduleBlock.delete({
        where: { id: blockId, userId: session.user.id },
    })
}

export async function updateScheduleBlock(blockId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const parsed = blockSchema.safeParse({
        dayOfWeek: formData.get("dayOfWeek"),
        startTime: formData.get("startTime"),
        endTime: formData.get("endTime"),
        label: formData.get("label"),
        category: formData.get("category") || undefined,
        color: formData.get("color") || undefined,
    })

    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const block = await prisma.scheduleBlock.update({
        where: { id: blockId, userId: session.user.id },
        data: {
            dayOfWeek: parsed.data.dayOfWeek,
            startTime: parsed.data.startTime,
            endTime: parsed.data.endTime,
            label: parsed.data.label,
            category: parsed.data.category || null,
            color: parsed.data.color || "#2E294E",
        },
    })

    return { block }
}