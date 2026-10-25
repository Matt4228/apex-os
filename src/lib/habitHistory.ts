import { formatDateOnly, parseDateOnly, toDateInputValue, weekRangeOf } from "@/lib/dates"

const DAY_MS = 24 * 60 * 60 * 1000

/** How many weeks the habit heatmap shows, this week included */
export const HEATMAP_WEEKS = 12

/** "2026-10-14" moved by a number of days */
const shift = (day: string, days: number) => toDateInputValue(new Date(parseDateOnly(day).getTime() + days * DAY_MS))

/** The first day the heatmap shows: Sunday, 11 weeks before this week's Sunday. Load logs from here */
export function heatmapStart(today: string): Date {
    return new Date(weekRangeOf(today).start.getTime() - (HEATMAP_WEEKS - 1) * 7 * DAY_MS)
}

/** Sunday to Saturday of today's week: true where the habit was logged */
export function weekOf(logDays: string[], today: string): boolean[] {
    const sunday = toDateInputValue(weekRangeOf(today).start)
    const logged = new Set(logDays)
    return Array.from({ length: 7 }, (_, i) => logged.has(shift(sunday, i)))
}

/**
 * Every day of the heatmap, oldest first, one week after another from Sunday: true logged, false not,
 * null for days after today. Always 7 x HEATMAP_WEEKS entries
 */
export function heatmapDays(logDays: string[], today: string): (boolean | null)[] {
    const first = toDateInputValue(heatmapStart(today))
    const logged = new Set(logDays)
    return Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
        const day = shift(first, i)
        return day > today ? null : logged.has(day)
    })
}

/**
 * Days in a row the habit was logged, ending today. When today isn't logged yet the run ending yesterday
 * still counts, so a streak doesn't read 0 every morning
 */
export function dayStreak(logDays: string[], today: string): number {
    const logged = new Set(logDays)
    let day = logged.has(today) ? today : shift(today, -1)
    let streak = 0
    while (logged.has(day)) {
        streak++
        day = shift(day, -1)
    }
    return streak
}

/** The Sunday that starts a day's week, "YYYY-MM-DD" */
const weekStart = (day: string) => toDateInputValue(weekRangeOf(day).start)

/** How many logs fell in each week, keyed by that week's Sunday */
function perWeek(logDays: string[]): Map<string, number> {
    const counts = new Map<string, number>()
    for (const day of new Set(logDays)) counts.set(weekStart(day), (counts.get(weekStart(day)) ?? 0) + 1)
    return counts
}

/**
 * Weeks in a row that hit the target, ending with this week. This week counts once it hits the target and doesn't
 * break the run while it's still under way, the same rule as a competition's streak
 */
export function weekStreak(logDays: string[], today: string, target: number): number {
    const counts = perWeek(logDays)
    const hit = (sunday: string) => (counts.get(sunday) ?? 0) >= target
    let sunday = weekStart(today)
    let streak = 0
    if (hit(sunday)) streak++
    sunday = shift(sunday, -7)
    while (hit(sunday)) {
        streak++
        sunday = shift(sunday, -7)
    }
    return streak
}

/** The longest run of "YYYY-MM-DD" keys, each `step` days after the one before */
function longestRun(keys: string[], step: number): number {
    const sorted = [...new Set(keys)].sort()
    let best = 0
    let run = 0
    sorted.forEach((key, i) => {
        run = i > 0 && shift(sorted[i - 1], step) === key ? run + 1 : 1
        best = Math.max(best, run)
    })
    return best
}

/** The most days in a row the habit was ever logged */
export const bestDayStreak = (logDays: string[]) => longestRun(logDays, 1)

/** The most weeks in a row the habit ever hit its target */
export function bestWeekStreak(logDays: string[], target: number): number {
    const hitWeeks = [...perWeek(logDays)].filter(([, count]) => count >= target).map(([sunday]) => sunday)
    return longestRun(hitWeeks, 7)
}

/**
 * Month names along the top of the heatmap: each over the first column whose Sunday is in that month. A label is
 * dropped when the next one starts fewer than three columns later, so short names never overlap
 */
export function monthLabels(today: string): { col: number; label: string }[] {
    const first = toDateInputValue(heatmapStart(today))
    const sundays = Array.from({ length: HEATMAP_WEEKS }, (_, col) => shift(first, col * 7))
    const starts = sundays.flatMap((sunday, col) =>
        col === 0 || sunday.slice(5, 7) !== sundays[col - 1].slice(5, 7) ? [{ col, label: formatDateOnly(sunday, "MMM") }] : []
    )
    return starts.filter((start, i) => !starts[i + 1] || starts[i + 1].col - start.col >= 3)
}

/** "Oct 14": a heatmap cell's day, for its tooltip */
export const heatmapLabel = (today: string, index: number) =>
    formatDateOnly(shift(toDateInputValue(heatmapStart(today)), index), "MMM d")
