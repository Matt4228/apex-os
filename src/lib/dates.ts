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