import { season, weekOf, type Position, type Season } from "@/lib/competition"
import { prisma } from "@/lib/prisma"
import { toDateInputValue } from "@/lib/dates"

const shape = {
    metrics: { orderBy: { sortOrder: "asc" as const }, include: { targets: true } },
}

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
    return {
        id: competition.id,
        title: competition.title,
        category: competition.category,
        startDate: toDateInputValue(competition.startDate),
        weeks: competition.weeks,
        isOwner: competition.ownerId === userId,
        position,
        metrics,
        targets,
        logs,
        season: season(metrics, targets, logs, competition, position),
    }
}

/** Every competition the user is in, newest start first */
export async function loadCompetitions(userId: string, today: string): Promise<CompetitionView[]> {
    const rows = await loadRows({ userId })
    return rows.map(row => toView(row, userId, today))
}

/** One competition, or null when the user isn't in it (so someone else's id shows nothing) */
export async function loadCompetition(competitionId: string, userId: string, today: string): Promise<CompetitionView | null> {
    const [row] = await loadRows({ competitionId, userId })
    return row ? toView(row, userId, today) : null
}
