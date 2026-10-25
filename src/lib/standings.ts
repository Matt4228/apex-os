import { rank, season, weekProgress, type Log, type Metric, type Position, type Season, type Target, type WeekProgress } from "@/lib/competition"
import type { CompetitorTotals } from "@/lib/competitionData"

/** One competitor, scored: their season, this week, this week's race number, and their place in the season */
export type Standing = {
    participantId: string
    userId: string
    name: string
    initials: string
    isYou: boolean
    season: Season
    week: WeekProgress | null
    /** This week's progress with each goal counting at most 100%: 100 means the week is done */
    race: number
    place: number
}

/** Each goal counts at most 100%, averaged: 100 means the week is done. Going past a target shows in the bars instead */
export function raceProgress(week: WeekProgress): number {
    if (week.metrics.length === 0) return 0
    return week.metrics.reduce((sum, m) => sum + Math.min(m.percent, 100), 0) / week.metrics.length
}

/** Everyone scored and in season rank order; the viewer's totals are replaced by `myLogs` so a new log counts at once */
export function standings({
    metrics,
    targets,
    competitors,
    myLogs,
    competition,
    position,
}: {
    metrics: Metric[]
    targets: Target[]
    competitors: CompetitorTotals[]
    myLogs: Log[]
    competition: { weeks: number }
    position: Position
}): Standing[] {
    const scored = competitors.map(({ totals, ...person }) => {
        const logs = person.isYou ? myLogs : totals
        const week = position.state === "active" ? weekProgress(metrics, targets, logs, position.week) : null
        const s = season(metrics, targets, logs, competition, position)
        // rank() reads the two numbers from the top level
        return { person, season: s, week, completedWeeks: s.completedWeeks, totalProgress: s.totalProgress }
    })
    return rank(scored).map(row => ({ ...row.person, season: row.season, week: row.week, race: row.week ? raceProgress(row.week) : 0, place: row.place }))
}

/** This week's race order: highest `race` first, then season place */
export function raceOrder(rows: Standing[]): Standing[] {
    return [...rows].sort((a, b) => b.race - a.race || a.place - b.place)
}

const firstName = (name: string) => name.split(" ")[0]

/** The people just ahead of and just behind you in the race, with the gap in points of `race` */
export function raceGaps(order: Standing[]): { ahead: { name: string; points: number } | null; behind: { name: string; points: number } | null } {
    const i = order.findIndex(r => r.isYou)
    if (i === -1) return { ahead: null, behind: null }
    const gap = (other: Standing | undefined) =>
        other ? { name: firstName(other.name), points: Math.round(Math.abs(other.race - order[i].race)) } : null
    return { ahead: gap(order[i - 1]), behind: gap(order[i + 1]) }
}
