import { parseDateOnly, toDateInputValue } from "@/lib/dates"
import { addDays, weekDates as calendarWeek } from "@/lib/occurrences"

/**
 * Competition scoring. A competition runs for a number of calendar weeks (Sunday to Saturday) from its start; each
 * week has a target for every metric. Nothing here touches the database, so every competitor is scored the same way
 */

const DAY_MS = 24 * 60 * 60 * 1000

type DateLike = Date | string
export type CompetitionShape = { startDate: DateLike; weeks: number }
export type Metric = { id: string; name: string; unit: string | null }
export type Target = { metricId: string; week: number; target: number }
export type Log = { metricId: string; week: number; amount: number }

export type WeekState = "complete" | "missed" | "current" | "ahead"
export type Position = { state: "upcoming" } | { state: "active"; week: number } | { state: "finished" }

const dayOf = (date: DateLike) => (typeof date === "string" ? date : toDateInputValue(date))

/** The Sunday that starts the week holding `day`: every competition starts on one */
export const sundayOf = (day: string) => calendarWeek(day)[0]

/** Where `day` falls: before the first Sunday, in week 1 to N, or after the last Saturday */
export function weekOf(competition: CompetitionShape, day: string): Position {
    const start = dayOf(competition.startDate)
    if (day < start) return { state: "upcoming" }
    const days = Math.round((parseDateOnly(day).getTime() - parseDateOnly(start).getTime()) / DAY_MS)
    const week = Math.floor(days / 7) + 1
    return week > competition.weeks ? { state: "finished" } : { state: "active", week }
}

/** A week's first and last day, Sunday to Saturday */
export function weekDates(competition: CompetitionShape, week: number): { from: string; to: string } {
    const from = addDays(dayOf(competition.startDate), (week - 1) * 7)
    return { from, to: addDays(from, 6) }
}

/** The competition's last day, a Saturday */
export const lastDay = (competition: CompetitionShape) => weekDates(competition, competition.weeks).to

export type MetricProgress = { metricId: string; total: number; target: number; percent: number }
export type WeekProgress = { metrics: MetricProgress[]; percent: number; complete: boolean }

/**
 * One week for one competitor: each metric's total against its target, uncapped, so working past the target shows.
 * The week's percent is the average of its metrics; it's complete when every metric reaches its target
 */
export function weekProgress(metrics: Metric[], targets: Target[], logs: Log[], week: number): WeekProgress {
    const rows = metrics.map(metric => {
        const total = logs.filter(l => l.metricId === metric.id && l.week === week).reduce((sum, l) => sum + l.amount, 0)
        const target = targets.find(t => t.metricId === metric.id && t.week === week)?.target ?? 0
        return { metricId: metric.id, total, target, percent: target > 0 ? (total / target) * 100 : 0 }
    })
    const percent = rows.length ? rows.reduce((sum, r) => sum + r.percent, 0) / rows.length : 0
    const complete = rows.length > 0 && rows.every(r => r.target > 0 && r.total >= r.target)
    return { metrics: rows, percent, complete }
}

export type Season = { completedWeeks: number; totalProgress: number; weeks: WeekState[] }

/**
 * A competitor's whole season so far. Weeks before the current one are complete or missed, the current one is
 * complete once done and current until then, later ones are ahead. Total progress adds up every week so far,
 * uncapped: the tie-breaker rewards out-working the targets
 */
export function season(metrics: Metric[], targets: Target[], logs: Log[], competition: { weeks: number }, position: Position): Season {
    const through = position.state === "finished" ? competition.weeks : position.state === "active" ? position.week : 0
    const states: WeekState[] = []
    let completedWeeks = 0
    let totalProgress = 0

    for (let week = 1; week <= competition.weeks; week++) {
        if (week > through) {
            states.push("ahead")
            continue
        }
        const progress = weekProgress(metrics, targets, logs, week)
        totalProgress += progress.percent
        if (progress.complete) completedWeeks++
        const isCurrent = position.state === "active" && week === position.week
        states.push(progress.complete ? "complete" : isCurrent ? "current" : "missed")
    }

    return { completedWeeks, totalProgress, weeks: states }
}

/** Order competitors: most completed weeks, then most total progress. Equal on both shares a place (1, 1, 3) */
export function rank<T extends { completedWeeks: number; totalProgress: number }>(rows: T[]): (T & { place: number })[] {
    const sorted = [...rows].sort((a, b) => b.completedWeeks - a.completedWeeks || b.totalProgress - a.totalProgress)
    return sorted.map((row, i) => {
        const first = sorted.findIndex(r => r.completedWeeks === row.completedWeeks && r.totalProgress === row.totalProgress)
        return { ...row, place: (first === -1 ? i : first) + 1 }
    })
}
