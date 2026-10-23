"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { parseDateOnly, toDateInputValue } from "@/lib/dates"

const habitSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  frequency: z.enum(["daily", "weekly"]),
  targetPerWeek: z.string(),
})

// A real calendar day as "YYYY-MM-DD". The round trip rejects days like "2026-02-30", which Date would roll forward.
// One refine, not .regex() then .refine(): zod still runs a refine after a failed regex, and a bad string would throw
const dateSchema = z.string().refine(day => /^\d{4}-\d{2}-\d{2}$/.test(day) && toDateInputValue(parseDateOnly(day)) === day)

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

  if (!dateSchema.safeParse(date).success) return { error: "Invalid date" }
  const completedOn = parseDateOnly(date)

  // A unique index allows one log per habit per day. Checking for a log and then adding one let two quick clicks
  // both see nothing and both add. Now the remove comes first, and a second add is stopped by the index
  const removed = await prisma.habitLog.deleteMany({ where: { habitId, completedOn } })
  if (removed.count > 0) return { action: "removed", date }

  try {
    const log = await prisma.habitLog.create({ data: { habitId, completedOn } })
    return { action: "added", date, log }
  } catch (error) {
    // Another request added this day's log between the remove and the add: either way the day is logged
    if (isUniqueViolation(error)) return { action: "added", date }
    throw error
  }
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

/** Pause (false) or resume (true) a habit. A paused habit leaves Today and keeps its history */
export async function toggleHabitActive(habitId: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const owned = await prisma.habit.findFirst({ where: { id: habitId, userId: session.user.id } })
  if (!owned) return { error: "Not found" }

  await prisma.habit.update({ where: { id: habitId }, data: { isActive } })
}