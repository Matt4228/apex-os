"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

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

  const [year, month, day] = date.split("-").map(Number)
  const targetDate = new Date(year, month - 1, day)
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

  const existing = await prisma.habitLog.findFirst({
    where: {
      habitId,
      completedOn: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return { action: "removed", date }
  } else {
    const log = await prisma.habitLog.create({
      data: {
        habitId,
        completedOn: targetDate,
      },
    })
    return { action: "added", date, log }
  }
}

export async function toggleHabitActive(habitId: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  await prisma.habit.update({
    where: { id: habitId, userId: session.user.id },
    data: { isActive },
  })
}