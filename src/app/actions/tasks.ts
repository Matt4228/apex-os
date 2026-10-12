"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { formatDateOnly, parseDateOnly, toDateInputValue } from "@/lib/dates"
import { getUserToday } from "@/lib/user-today"

const taskSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional(),
  goalId: z.string().optional(),
  plannedFor: z.literal("today").optional(),
})

const taskStatusSchema = z.enum(["todo", "done"])

// A block id comes from the client: a string, or null for "anytime". Anything else (like a Prisma filter object) is rejected
const blockIdSchema = z.string().min(1).nullable()

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
    plannedFor: formData.get("plannedFor") || undefined,
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
      plannedFor: parsed.data.plannedFor ? parseDateOnly(await getUserToday()) : null,
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

// Planning always means the user's today, worked out on the server
export async function planTask(taskId: string, planned: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  await prisma.task.update({
    where: { id: taskId, userId: session.user.id },
    data: { plannedFor: planned ? parseDateOnly(await getUserToday()) : null, scheduleBlockId: null },
  })
}

// Puts one of today's planned tasks into one of today's schedule blocks, or back to anytime with null
export async function assignBlock(taskId: string, blockId: string | null) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  const userId = session.user.id

  const parsed = blockIdSchema.safeParse(blockId)
  if (!parsed.success) return { error: "Invalid input" }

  const today = await getUserToday()

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { plannedFor: true },
  })
  if (!task) return { error: "Task not found" }
  if (!task.plannedFor || toDateInputValue(task.plannedFor) !== today) {
    return { error: "Plan the task for today first" }
  }

  if (parsed.data !== null) {
    const block = await prisma.scheduleBlock.findFirst({
      where: { id: parsed.data, userId },
      select: { dayOfWeek: true },
    })
    if (!block) return { error: "Block not found" }
    if (block.dayOfWeek !== formatDateOnly(parseDateOnly(today), "EEEE")) {
      return { error: "That block isn't on today's schedule" }
    }
  }

  await prisma.task.update({
    where: { id: taskId, userId },
    data: { scheduleBlockId: parsed.data },
  })
  revalidatePath("/dashboard")
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