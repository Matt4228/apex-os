"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const blockSchema = z.object({
    dayOfWeek: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    label: z.string().min(1),
    category: z.string().optional(),
    color: z.string().optional(),
})

export async function createScheduleBlock(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    const parsed = blockSchema.safeParse({
        dayOfWeek: String(formData.get("dayOfWeek")),
        startTime: String(formData.get("startTime")),
        endTime: String(formData.get("endTime")),
        label: String(formData.get("label")),
        category: formData.get("category") ? String(formData.get("category")) : undefined,
        color: formData.get("color") ? String(formData.get("color")) : undefined,
    })

    if (!parsed.success) {
        console.log("Zod validation failed:", JSON.stringify(parsed.error.issues, null, 2))
        return { error: "Invalid input"}
    }

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
            color: parsed.data.color || "#1a1a2e",
            sortOrder: (lastBlock?.sortOrder ?? -1) + 1,
        },
    })

    return { block }
}

export async function deleteScheduleBlock(blockId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    await prisma.scheduleBlock.delete({
        where: { id: blockId, userId: session.user.id },
    })
}

export async function updateBlockOrder(blockIds: string[]) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    await Promise.all(
    blockIds.map((id, index) =>
      prisma.scheduleBlock.update({
        where: { id, userId: session.user!.id },
        data: { sortOrder: index },
      })
    )
  )
}

export async function updateScheduleBlock(blockId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    const parsed = blockSchema.safeParse({
        dayOfWeek: formData.get("dayOfWeek"),
        startTime: formData.get("startTime"),
        endTime: formData.get("endTime"),
        label: formData.get("label"),
        category: formData.get("category") || undefined,
        color: formData.get("color") || undefined,
    })

    if (!parsed.success) return { error: "Schedule Component: Invalid input" }

    const block = await prisma.scheduleBlock.update({
        where: { id: blockId, userId: session.user.id },
        data: {
            dayOfWeek: parsed.data.dayOfWeek,
            startTime: parsed.data.startTime,
            endTime: parsed.data.endTime,
            label: parsed.data.label,
            category: parsed.data.category || null,
            color: parsed.data.color || "#1a1a2e",
        },
    })

    return { block }
}