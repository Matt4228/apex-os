"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/dates"
import { sundayOf, weekOf } from "@/lib/competition"
import { getUserToday } from "@/lib/user-today"

const MAX_WEEKS = 26
const MAX_METRICS = 3

const metricSchema = z.object({
    name: z.string().trim().min(1, "Name every metric"),
    unit: z.string().trim().optional(),
    targets: z.array(z.number().positive("Every target has to be above 0")),
})

const competitionSchema = z
    .object({
        title: z.string().trim().min(1, "Give the competition a name"),
        category: z.string().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
        weeks: z.coerce.number().int().min(1, "It runs at least 1 week").max(MAX_WEEKS, `It runs at most ${MAX_WEEKS} weeks`),
        metrics: z.array(metricSchema).min(1, "Add at least one metric").max(MAX_METRICS, `Up to ${MAX_METRICS} metrics`),
    })
    .refine(c => c.metrics.every(m => m.targets.length === c.weeks), {
        error: "Every metric needs a target for each week",
        path: ["metrics"],
    })

function readMetrics(formData: FormData): unknown {
    try {
        return JSON.parse(String(formData.get("metrics") ?? "[]"))
    } catch {
        return null
    }
}

/**
 * Creates a competition with its metrics, a target for every week of each, and the creator as its first
 * participant. The start date is moved back to its week's Sunday, so weeks line up with the calendar
 */
export async function createCompetition(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const userId = session.user.id

    const parsed = competitionSchema.safeParse({
        title: formData.get("title") ?? "",
        category: formData.get("category") || undefined,
        startDate: formData.get("startDate") ?? "",
        weeks: formData.get("weeks") ?? "",
        metrics: readMetrics(formData),
    })
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const c = parsed.data

    const competition = await prisma.competition.create({
        data: {
            ownerId: userId,
            title: c.title,
            category: c.category || null,
            startDate: parseDateOnly(sundayOf(c.startDate)),
            weeks: c.weeks,
            participants: { create: { userId, role: "owner" } },
            metrics: {
                create: c.metrics.map((m, i) => ({
                    name: m.name,
                    unit: m.unit || null,
                    sortOrder: i,
                    targets: { create: m.targets.map((target, w) => ({ week: w + 1, target })) },
                })),
            },
        },
    })

    revalidatePath("/dashboard/competitions")
    return { competition }
}

/** The caller's place in a competition, with the competition, or null if they aren't in it */
async function membership(competitionId: string, userId: string) {
    return prisma.participant.findFirst({
        where: { competitionId, userId },
        include: { competition: true },
    })
}

const logSchema = z.object({
    metricId: z.string().min(1),
    amount: z.coerce.number().positive("Log an amount above 0"),
    note: z.string().trim().max(200, "Keep the note under 200 characters").optional(),
})

/** Logs progress into this week, the only week that takes logs. The week comes from the user's own calendar day */
export async function logProgress(competitionId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const parsed = logSchema.safeParse({
        metricId: formData.get("metricId") ?? "",
        amount: formData.get("amount") ?? "",
        note: formData.get("note") || undefined,
    })
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const participant = await membership(competitionId, session.user.id)
    if (!participant) return { error: "Not found" }

    const position = weekOf(participant.competition, await getUserToday())
    if (position.state === "upcoming") return { error: "This competition hasn't started yet" }
    if (position.state === "finished") return { error: "This competition has finished" }

    const metric = await prisma.competitionMetric.findFirst({ where: { id: parsed.data.metricId, competitionId } })
    if (!metric) return { error: "Not found" }

    const log = await prisma.progressLog.create({
        data: {
            participantId: participant.id,
            metricId: metric.id,
            week: position.week,
            amount: parsed.data.amount,
            note: parsed.data.note || null,
        },
    })

    revalidatePath(`/dashboard/competitions/${competitionId}`)
    return { log }
}

/** Removes one of your own logs, from this week only: finished weeks stay as they were */
export async function deleteLog(logId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const log = await prisma.progressLog.findFirst({
        where: { id: logId, participant: { userId: session.user.id } },
        include: { participant: { include: { competition: true } } },
    })
    if (!log) return { error: "Not found" }

    const position = weekOf(log.participant.competition, await getUserToday())
    if (position.state !== "active" || position.week !== log.week) return { error: "Only this week's logs can be removed" }

    await prisma.progressLog.delete({ where: { id: logId } })
    revalidatePath(`/dashboard/competitions/${log.participant.competition.id}`)
}

const targetsSchema = z.array(z.object({ metricId: z.string().min(1), week: z.number().int().min(1), target: z.number().positive("Every target has to be above 0") }))

/**
 * Changes targets for weeks that haven't started, owner only. Before the competition starts every week counts;
 * once it runs, the current week and earlier stay fixed, so nobody's finished week changes under them
 */
export async function updateFutureTargets(competitionId: string, targets: { metricId: string; week: number; target: number }[]) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const parsed = targetsSchema.safeParse(targets)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const competition = await prisma.competition.findFirst({
        where: { id: competitionId, ownerId: session.user.id },
        include: { metrics: { select: { id: true } } },
    })
    if (!competition) return { error: "Not found" }

    const position = weekOf(competition, await getUserToday())
    const firstEditable = position.state === "upcoming" ? 1 : position.state === "active" ? position.week + 1 : Infinity
    const metricIds = new Set(competition.metrics.map(m => m.id))
    for (const t of parsed.data) {
        if (!metricIds.has(t.metricId) || t.week > competition.weeks) return { error: "Not found" }
        if (t.week < firstEditable) return { error: "Only weeks that haven't started can change" }
    }

    await prisma.$transaction(
        parsed.data.map(t =>
            prisma.weekTarget.upsert({
                where: { metricId_week: { metricId: t.metricId, week: t.week } },
                create: t,
                update: { target: t.target },
            }),
        ),
    )
    revalidatePath(`/dashboard/competitions/${competitionId}`)
}

export async function deleteCompetition(competitionId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    // Throws when there's no such competition of the caller's; the deleted-items route turns that into a 404
    await prisma.competition.delete({ where: { id: competitionId, ownerId: session.user.id } })
}
