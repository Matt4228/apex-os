"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { dayRangeOf } from "@/lib/dates"

const habitSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  frequency: z.enum(["daily", "weekly"]),
  targetPerWeek: z.string(),
})

export async function createHabit(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = habitSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    frequency: formData.get("frequency"),
    targetPerWeek: formData.get("targetPerWeek"),
  })

  if (!parsed.success) return { error: "Invalid input" }

  const habit = await prisma.habit.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      category: parsed.data.category || null,
      frequency: parsed.data.frequency,
      targetPerWeek: parseInt(parsed.data.targetPerWeek),
      isActive: true,
    },
  })

  return { habit: { ...habit, logs: [] } }
}

export async function updateHabit(habitId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = habitSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    frequency: formData.get("frequency"),
    targetPerWeek: formData.get("targetPerWeek"),
  })
  if (!parsed.success) return { error: "Invalid input" }

  // Only the owner's habit: someone else's id finds nothing
  const owned = await prisma.habit.findFirst({ where: { id: habitId, userId: session.user.id } })
  if (!owned) return { error: "Not found" }

  const habit = await prisma.habit.update({
    where: { id: habitId },
    data: {
      title: parsed.data.title,
      category: parsed.data.category || null,
      frequency: parsed.data.frequency,
      targetPerWeek: parseInt(parsed.data.targetPerWeek),
    },
  })

  return { habit }
}

export async function deleteHabit(habitId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  await prisma.habit.delete({
    where: { id: habitId, userId: session.user.id },
  })
}

export async function toggleHabitLog(habitId: string, date: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId: session.user.id },
  })
  if (!habit) return { error: "Not found" }

  const { start, end } = dayRangeOf(date)

  const existing = await prisma.habitLog.findFirst({
    where: {
      habitId,
      completedOn: { gte: start, lt: end},
    },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return { action: "removed", date }
  } else {
    const log = await prisma.habitLog.create({
      data: {
        habitId,
        completedOn: start,
      },
    })
    return { action: "added", date, log }
  }
}

/** Pause (false) or resume (true) a habit. A paused habit leaves Today and keeps its history */
export async function toggleHabitActive(habitId: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const owned = await prisma.habit.findFirst({ where: { id: habitId, userId: session.user.id } })
  if (!owned) return { error: "Not found" }

  await prisma.habit.update({ where: { id: habitId }, data: { isActive } })
}