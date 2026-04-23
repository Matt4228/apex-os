"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const goalSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    targetDate: z.string().optional(),
    targetValue: z.string().optional(),
    unit: z.string().optional(),
})

export async function createGoal(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }
    
    const parsed = goalSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description") || undefined,
        category: formData.get("category") || undefined,
        targetDate: formData.get("targetDate") || undefined,
        targetValue: formData.get("targetvalue") || undefined,
        unit: formData.get("unit") || undefined,
    })

    if (!parsed.success) return { error: "Invalid input"}

    const goal = await prisma.goal.create({
        data: {
            userId: session.user.id,
            title: parsed.data.title,
            description: parsed.data.description || null,
            category: parsed.data.category || null,
            targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
            targetValue: parsed.data.targetValue ? parseFloat(parsed.data.targetValue) : null,
            status: "active",
        },
    })

    return { goal }
}

export async function deleteGoal(goalId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    await prisma.goal.delete({
        where: { id: goalId, userId: session.user.id },
    })
}

export async function updateGoalStatus(goalId: string, status: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    await prisma.goal.update({
        where: { id: goalId, userId: session.user.id },
        data: { status },
    })
}

export async function logGoalEntry(goalId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const value = formData.get("value")
    const note = formData.get("note")

    if (!value) return { error: "Value is required" }

    const entry = await prisma.goalEntry.create({
        data: {
            goalId,
            value: parseFloat(value as string),
            note: note as string || null,
            loggedOn: new Date(),
        },
    })

    return { entry }
}