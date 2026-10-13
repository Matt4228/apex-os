import { parseDateOnly, toDateInputValue } from "@/lib/dates"
import { weekDates } from "@/lib/occurrences"

/**
 * The Sunday of the week to show: the week holding `param` ("YYYY-MM-DD", any day of it) when it's a real date,
 * otherwise the week holding today. Anything else in the address falls back quietly
 */
export function weekStartFor(param: string | undefined, today: string): string {
    const valid = param !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(param) && toDateInputValue(parseDateOnly(param)) === param
    return weekDates(valid ? param : today)[0]
}
