"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const taskSchema = z.object({
    title: z.string().min(1),
    priority: z.enum(["low", "medium", "high"]),
    dueDate: z.string().optional(),
    goalId: z.string().optional(),
})

export async function createTask(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unuthorized"}

    const parsed = taskSchema.safeParse({
        title: formData.get("title"),
        priority: formData.get("priority"),
        dueDate: formData.get("dueDate") || undefined,
        goalId: formData.get("goalId") || undefined,
    })

    if (!parsed.success) return { error: "Invalid input" }

    await prisma.task.create({
        data: {
            userId: session.user.id,
            title: parsed.data.title,
            priority: parsed.data.priority,
            dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
            goalId: parsed.data.goalId || null,
            status: "todo",
        },
    })

    revalidatePath("/dashboard/tasks")
}

export async function updateTaskStatus(taskId: string, status: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await prisma.task.update({
        where: { id: taskId, userId: session.user.id },
        data: {
            status,
            completedAt: status === "done" ? new Date() : null,
        },
    })
}

export async function deleteTask(taskId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    await prisma.task.delete({
        where: { id: taskId, userId: session.user.id },
    })

    revalidatePath("/dashboard/tasks")
}

export async function updateTask(taskID: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const parsed = taskSchema.safeParse({
        title: formData.get("title"),
        priority: formData.get("priority"),
        dueDate: formData.get("dueDate") || undefined,
        goalId: formData.get("goalId") || undefined,
    })

    if (!parsed.success) return { error: "Invalid input" }

    await prisma.task.update({
        where: { id: taskID, userId: session.user.id },
        data: {
            title: parsed.data.title,
            priority: parsed.data.priority,
            dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
            goalId: parsed.data.goalId || null,
        },
    })

    revalidatePath("/dashboard/tasks")
}