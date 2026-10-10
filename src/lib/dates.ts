import { format } from "date-fns"

// Calendar dates (due dates, target dates, habit check-ins) are stored as
// midnight UTC and always read back in UTC, so "Oct 15" stays Oct 15 in
// every timezone instead of drifting to the previous day west of UTC.

/** "2026-10-15" from a date input -> 2026-10-15T00:00:00Z */
export function parseDateOnly(value: string): Date {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(Date.UTC(year, month-1, day))
}

/** A stored calendar date -> "2026-10-15", for a date input's value */
export function toDateInputValue(date: Date | string): string {
    return new Date(date).toISOString().slice(0, 10)
}

/** A stored calendar date -> formatted text, e.g. "Oct 15", using its UTC day */
export function formatDateOnly(date: Date | string, pattern: string): string {
    const d = new Date(date)
    return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), pattern)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** The [start, end) range covering one calendar day, for database queries */
export function dayRangeOf(day: string): { start: Date, end: Date } {
    const start = parseDateOnly(day)
    return { start, end: new Date(start.getTime() + DAY_MS)}
}

/** The [start, end) range for the Sunday-to-Saturday week containing `day` */
export function weekRangeOf(day: string): { start: Date, end: Date } {
    const date = parseDateOnly(day)
    const start = new Date(date.getTime() - date.getUTCDay() * DAY_MS)
    return { start, end: new Date(start.getTime() + 7 * DAY_MS)}
}

/** Name of the cookie the browser users to tell the server its timezone */
export const TIMEZONE_COOKIE = "tz"

/** Today's calendar day ("2026-10-10") in an IANA timezone like "America/New_York" */
export function todayIn(timeZone: string, now: Date = new Date()): string {
    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(now)
    } catch {
        // Unknown timezone (the cookie is user-controlled): use UTC rather than crash
        return now.toISOString().slice(0,10)
    }
}