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

/** "Oct 14": a heatmap cell's day, for its tooltip */
export const heatmapLabel = (today: string, index: number) =>
    formatDateOnly(shift(toDateInputValue(heatmapStart(today)), index), "MMM d")
