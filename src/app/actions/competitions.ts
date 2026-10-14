"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/dates"
import { sundayOf, weekOf } from "@/lib/competition"
import { getUserToday } from "@/lib/user-today"
import { looksLikeJoinCode, newJoinCode } from "@/lib/joinCode"

/** Three years of weeks: few competitions run that long, so it's the worst case the screens plan for */
const MAX_WEEKS = 156
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
        weeks: z.coerce.number().int().min(1, "It runs at least 1 week").max(MAX_WEEKS, `It runs at most ${MAX_WEEKS} weeks (3 years)`),
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
            joinCode: newJoinCode(),
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

/** Is the competition over by the user's own calendar day? Nobody joins a finished competition */
async function finished(competition: { startDate: Date; weeks: number }) {
    return weekOf(competition, await getUserToday()).state === "finished"
}

/**
 * Invites friends to a competition, owner only. Each must be an accepted friend of the owner and not already in it;
 * a declined invite is opened again
 */
export async function inviteFriends(competitionId: string, userIds: string[]) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const me = session.user.id
    if (!Array.isArray(userIds) || userIds.length === 0 || userIds.some(id => typeof id !== "string")) return { error: "Pick someone to invite" }

    const competition = await prisma.competition.findFirst({ where: { id: competitionId, ownerId: me } })
    if (!competition) return { error: "Not found" }
    if (await finished(competition)) return { error: "This competition has finished" }

    const [friendships, members] = await Promise.all([
        prisma.friendship.findMany({
            where: {
                status: "accepted",
                OR: [{ requesterId: me, addresseeId: { in: userIds } }, { addresseeId: me, requesterId: { in: userIds } }],
            },
        }),
        prisma.participant.findMany({ where: { competitionId, userId: { in: userIds } }, select: { userId: true } }),
    ])
    const friends = new Set(friendships.map(f => (f.requesterId === me ? f.addresseeId : f.requesterId)))
    const inAlready = new Set(members.map(m => m.userId))
    if (userIds.some(id => !friends.has(id))) return { error: "You can only invite friends" }
    if (userIds.some(id => inAlready.has(id))) return { error: "They're already in this competition" }

    await prisma.$transaction(
        userIds.map(inviteeId =>
            prisma.competitionInvite.upsert({
                where: { competitionId_inviteeId: { competitionId, inviteeId } },
                create: { competitionId, inviterId: me, inviteeId },
                update: { status: "pending", inviterId: me },
            }),
        ),
    )
    revalidatePath(`/dashboard/competitions/${competitionId}`)
}

/** Accepts or declines an invite sent to you. Accepting makes you a member from today: earlier weeks count as missed */
export async function respondToInvite(inviteId: string, accept: boolean) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const me = session.user.id

    const invite = await prisma.competitionInvite.findFirst({
        where: { id: inviteId, inviteeId: me, status: "pending" },
        include: { competition: true },
    })
    if (!invite) return { error: "Not found" }

    if (!accept) {
        await prisma.competitionInvite.update({ where: { id: inviteId }, data: { status: "declined" } })
        revalidatePath("/dashboard", "layout")
        return { competitionId: null }
    }
    if (await finished(invite.competition)) return { error: "This competition has finished" }

    await prisma.$transaction([
        prisma.participant.create({ data: { competitionId: invite.competitionId, userId: me, role: "member" } }),
        prisma.competitionInvite.delete({ where: { id: inviteId } }),
    ])
    revalidatePath("/dashboard", "layout")
    return { competitionId: invite.competitionId }
}

/** Joins with an invite link's code. Joining twice changes nothing; a finished competition can't be joined */
export async function joinByCode(code: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
    const me = session.user.id
    if (typeof code !== "string" || !looksLikeJoinCode(code)) return { error: "Not found" }

    const competition = await prisma.competition.findUnique({ where: { joinCode: code } })
    if (!competition) return { error: "Not found" }
    if (await finished(competition)) return { error: "This competition has finished" }

    const existing = await prisma.participant.findFirst({ where: { competitionId: competition.id, userId: me } })
    if (!existing) {
        await prisma.$transaction([
            prisma.participant.create({ data: { competitionId: competition.id, userId: me, role: "member" } }),
            // An invite to the same competition is answered by joining
            prisma.competitionInvite.deleteMany({ where: { competitionId: competition.id, inviteeId: me } }),
        ])
    }
    revalidatePath("/dashboard", "layout")
    return { competitionId: competition.id }
}

/** A new invite link, owner only: the old link stops working */
export async function resetJoinCode(competitionId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const competition = await prisma.competition.findFirst({ where: { id: competitionId, ownerId: session.user.id } })
    if (!competition) return { error: "Not found" }

    const updated = await prisma.competition.update({ where: { id: competitionId }, data: { joinCode: newJoinCode() } })
    return { joinCode: updated.joinCode }
}

/** Leaves a competition, members only (the owner deletes it instead). Your logs in it go with you */
export async function leaveCompetition(competitionId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const participant = await prisma.participant.findFirst({ where: { competitionId, userId: session.user.id } })
    if (!participant) return { error: "Not found" }
    if (participant.role === "owner") return { error: "The owner can't leave. Delete the competition instead" }

    await prisma.participant.delete({ where: { id: participant.id } })
    revalidatePath("/dashboard/competitions")
}

/** Removes a member, owner only. Their logs in it go with them */
export async function removeParticipant(competitionId: string, participantId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const competition = await prisma.competition.findFirst({ where: { id: competitionId, ownerId: session.user.id } })
    if (!competition) return { error: "Not found" }
    const participant = await prisma.participant.findFirst({ where: { id: participantId, competitionId, role: "member" } })
    if (!participant) return { error: "Not found" }

    await prisma.participant.delete({ where: { id: participantId } })
    revalidatePath(`/dashboard/competitions/${competitionId}`)
}
