import { season, weekOf, type Log, type Position, type Season } from "@/lib/competition"
import { prisma } from "@/lib/prisma"
import { toDateInputValue } from "@/lib/dates"
import { displayName, initialsOf } from "@/lib/people"
import { standings } from "@/lib/standings"

const person = { select: { id: true, name: true, email: true } }

const shape = {
    metrics: { orderBy: { sortOrder: "asc" as const }, include: { targets: true } },
    participants: { orderBy: { joinedAt: "asc" as const }, include: { user: person } },
    invites: { where: { status: "pending" as const }, include: { invitee: person } },
}

/** Someone in (or invited to) a competition, as the people panel shows them */
export type Member = { participantId: string; userId: string; name: string; initials: string; role: string; isYou: boolean }
export type Invited = { inviteId: string; userId: string; name: string; initials: string }

/** A competition as the screens need it, scored for one participant */
export type CompetitionView = {
    id: string
    title: string
    category: string | null
    startDate: string
    weeks: number
    isOwner: boolean
    position: Position
    metrics: { id: string; name: string; unit: string | null }[]
    targets: { metricId: string; week: number; target: number }[]
    logs: { id: string; metricId: string; week: number; amount: number; note: string | null; createdAt: Date }[]
    season: Season
    people: Member[]
    /** Owner only: friends invited and not yet answered */
    invited: Invited[]
    /** Owner only: the code in the invite link */
    joinCode: string | null
    /** Finished competitions on the list only: your final place, or "solo" when nobody else was in it */
    place?: number | "solo"
}

type Row = Awaited<ReturnType<typeof loadRows>>[number]

function loadRows(where: object) {
    return prisma.participant.findMany({
        where,
        include: {
            competition: { include: shape },
            logs: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { competition: { startDate: "desc" } },
    })
}

function toView(row: Row, userId: string, today: string): CompetitionView {
    const { competition } = row
    const metrics = competition.metrics.map(({ id, name, unit }) => ({ id, name, unit }))
    const targets = competition.metrics.flatMap(m => m.targets.map(t => ({ metricId: m.id, week: t.week, target: t.target })))
    const logs = row.logs.map(({ id, metricId, week, amount, note, createdAt }) => ({ id, metricId, week, amount, note, createdAt }))
    const position = weekOf(competition, today)
    const isOwner = competition.ownerId === userId
    const people = competition.participants.map(p => ({
        participantId: p.id,
        userId: p.userId,
        name: displayName(p.user.name, p.user.email),
        initials: initialsOf(p.user.name, p.user.email),
        role: p.role,
        isYou: p.userId === userId,
    }))
    const invited = isOwner
        ? competition.invites.map(i => ({
              inviteId: i.id,
              userId: i.inviteeId,
              name: displayName(i.invitee.name, i.invitee.email),
              initials: initialsOf(i.invitee.name, i.invitee.email),
          }))
        : []
    return {
        id: competition.id,
        title: competition.title,
        category: competition.category,
        startDate: toDateInputValue(competition.startDate),
        weeks: competition.weeks,
        isOwner,
        position,
        metrics,
        targets,
        logs,
        season: season(metrics, targets, logs, competition, position),
        people,
        invited,
        joinCode: isOwner ? competition.joinCode : null,
    }
}

/** An invite waiting for the user's answer, with what joining now would mean */
export type InviteView = {
    inviteId: string
    competitionId: string
    title: string
    category: string | null
    weeks: number
    inviter: { name: string; initials: string }
    /** Weeks already over, which count as missed for someone joining now */
    weeksPassed: number
    weeksLeft: number
    upcoming: boolean
}

/** Invites to running or upcoming competitions waiting for the user's answer */
export async function loadInvites(userId: string, today: string): Promise<InviteView[]> {
    const invites = await prisma.competitionInvite.findMany({
        where: { inviteeId: userId, status: "pending" },
        include: { competition: true, inviter: person },
        orderBy: { createdAt: "desc" },
    })
    return invites.flatMap(invite => {
        const position = weekOf(invite.competition, today)
        if (position.state === "finished") return []
        const weeksPassed = position.state === "active" ? position.week - 1 : 0
        return [{
            inviteId: invite.id,
            competitionId: invite.competitionId,
            title: invite.competition.title,
            category: invite.competition.category,
            weeks: invite.competition.weeks,
            inviter: { name: displayName(invite.inviter.name, invite.inviter.email), initials: initialsOf(invite.inviter.name, invite.inviter.email) },
            weeksPassed,
            weeksLeft: invite.competition.weeks - weeksPassed,
            upcoming: position.state === "upcoming",
        }]
    })
}

/** Every competition the user is in, newest start first. Finished ones carry your final place */
export async function loadCompetitions(userId: string, today: string): Promise<CompetitionView[]> {
    const rows = await loadRows({ userId })
    const views = rows.map(row => toView(row, userId, today))

    // Places need everyone's weekly totals, summed in one query, and only for finished competitions with rivals
    const raced = rows.filter((row, i) => views[i].position.state === "finished" && row.competition.participants.length > 1)
    const sums = raced.length
        ? await prisma.progressLog.groupBy({
              by: ["participantId", "metricId", "week"],
              where: { participant: { competitionId: { in: raced.map(row => row.competitionId) } } },
              _sum: { amount: true },
          })
        : []

    return views.map((view, i) => {
        if (view.position.state !== "finished") return view
        const { participants } = rows[i].competition
        if (participants.length < 2) return { ...view, place: "solo" as const }
        const competitors = participants.map(p => ({
            participantId: p.id,
            userId: p.userId,
            name: displayName(p.user.name, p.user.email),
            initials: initialsOf(p.user.name, p.user.email),
            isYou: p.userId === userId,
            totals: sums
                .filter(s => s.participantId === p.id)
                .map(s => ({ metricId: s.metricId, week: s.week, amount: s._sum.amount ?? 0 })),
        }))
        // Scored by the same function as the competition page, so the two never disagree; only the place leaves here
        const ranked = standings({ metrics: view.metrics, targets: view.targets, competitors, myLogs: view.logs, competition: view, position: view.position })
        return { ...view, place: ranked.find(r => r.isYou)?.place }
    })
}

/** Someone in the competition and their weekly totals per goal, summed on the server */
export type CompetitorTotals = { participantId: string; userId: string; name: string; initials: string; isYou: boolean; totals: Log[] }

/** One log from anyone in the competition, for the activity feed. Everyone in a competition sees these, notes included */
export type ActivityEntry = {
    id: string
    participantId: string
    name: string
    initials: string
    isYou: boolean
    metricId: string
    week: number
    amount: number
    note: string | null
    createdAt: Date
}

/** The competition page's data: the view plus everyone's totals, the latest logs, and when it was loaded */
export type CompetitionDetailView = CompetitionView & { competitors: CompetitorTotals[]; activity: ActivityEntry[]; loadedAt: string }

/** How many of the latest logs the feed gets, so a long season doesn't send every log it has */
export const ACTIVITY_LIMIT = 100

/** One competition, or null when the user isn't in it (so someone else's id shows nothing) */
export async function loadCompetition(competitionId: string, userId: string, today: string): Promise<CompetitionDetailView | null> {
    const [row] = await loadRows({ competitionId, userId })
    if (!row) return null

    const inCompetition = { participant: { competitionId } }
    const [sums, latest] = await Promise.all([
        prisma.progressLog.groupBy({ by: ["participantId", "metricId", "week"], where: inCompetition, _sum: { amount: true } }),
        prisma.progressLog.findMany({
            where: inCompetition,
            orderBy: { createdAt: "desc" },
            take: ACTIVITY_LIMIT,
            include: { participant: { include: { user: person } } },
        }),
    ])

    const competitors = row.competition.participants.map(p => ({
        participantId: p.id,
        userId: p.userId,
        name: displayName(p.user.name, p.user.email),
        initials: initialsOf(p.user.name, p.user.email),
        isYou: p.userId === userId,
        totals: sums
            .filter(s => s.participantId === p.id)
            .map(s => ({ metricId: s.metricId, week: s.week, amount: s._sum.amount ?? 0 })),
    }))
    const activity = latest.map(({ id, participantId, metricId, week, amount, note, createdAt, participant }) => ({
        id,
        participantId,
        name: displayName(participant.user.name, participant.user.email),
        initials: initialsOf(participant.user.name, participant.user.email),
        isYou: participant.userId === userId,
        metricId,
        week,
        amount,
        note,
        createdAt,
    }))

    return { ...toView(row, userId, today), competitors, activity, loadedAt: new Date().toISOString() }
}
