"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/dates"

const taskSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  goalId: z.string().optional(),
})

const taskStatusSchema = z.enum(["todo", "done"])

// A goalId comes from the client, so confirm it is the caller's goal before linking to it
async function ownsGoal(userId: string, goalId: string) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  })
  return goal !== null
}

export async function createTask(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || undefined,
    goalId: formData.get("goalId") || undefined,
  })

  if (!parsed.success) return { error: "Invalid input" }
  if (parsed.data.goalId && !(await ownsGoal(session.user.id, parsed.data.goalId))) {
    return { error: "Goal not found" }
  }

  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? parseDateOnly(parsed.data.dueDate) : null,
      goalId: parsed.data.goalId || null,
      status: "todo",
    },
  })

  return { task }
}

export async function updateTaskStatus(taskId: string, status: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = taskStatusSchema.safeParse(status)

  if (!parsed.success) return { error: "Invalid status" }

  await prisma.task.update({
    where: { id: taskId, userId: session.user.id },
    data: {
      status: parsed.data,
      completedAt: parsed.data === "done" ? new Date() : null,
    },
  })
}

export async function deleteTask(taskId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  await prisma.task.delete({
    where: { id: taskId, userId: session.user.id },
  })
}

export async function updateTask(taskId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Forms without a goal field leave the link alone; an empty goal field means "no goal"
  const goalFieldSent = formData.has("goalId")

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || undefined,
    goalId: formData.get("goalId") || undefined,
  })

  if (!parsed.success) return { error: "Invalid input" }

  if (parsed.data.goalId && !(await ownsGoal(session.user.id, parsed.data.goalId))) {
    return { error: "Goal not found" }
  }

  await prisma.task.update({
    where: { id: taskId, userId: session.user.id },
    data: {
      title: parsed.data.title,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? parseDateOnly(parsed.data.dueDate) : null,
      ...(goalFieldSent ? { goalId: parsed.data.goalId ?? null } : {}),
    },
  })

  revalidatePath("/dashboard/tasks")
  // "layout" covers the Goals list and every goal page under it
  revalidatePath("/dashboard/goals", "layout")
}