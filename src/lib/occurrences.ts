import { parseDateOnly, toDateInputValue } from "@/lib/dates"

/**
 * Repeating blocks, the way calendar apps do it (a small part of iCalendar, RFC 5545): a block is a series with a
 * start date and a repeat rule, and a changed day is an exception. Nothing here touches the database, so every rule
 * is a plain unit test.
 */

export const REPEATS = ["none", "daily", "weekday", "weekly", "monthly"] as const
export type Repeat = (typeof REPEATS)[number]

type DateLike = Date | string

export type SeriesBlock = {
    id: string
    label: string
    category: string | null
    startTime: string
    endTime: string
    startDate: DateLike
    repeat: string
    /** For "weekly": 0 is Sunday */
    repeatDays: number[]
    /** Last possible day, inclusive */
    endsOn: DateLike | null
    /** How many times, counted from startDate */
    endsAfter: number | null
}

export type Exception = {
    blockId: string
    /** The day it would have happened */
    date: DateLike
    cancelled: boolean
    newDate: DateLike | null
    startTime: string | null
    endTime: string | null
    label: string | null
    category: string | null
}

/** One block on one day, ready to draw */
export type Occurrence = {
    blockId: string
    /** Where it shows: the new day if it was moved */
    date: string
    /** The series day it came from */
    originalDate: string
    startTime: string
    endTime: string
    label: string
    category: string | null
    repeats: boolean
    changed: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "YYYY-MM-DD", from a Prisma date or a string already in that form */
const dayOf = (date: DateLike) => (typeof date === "string" ? date : toDateInputValue(date))
/** "2026-10-14" moved by a number of days */
export const addDays = (day: string, days: number) => toDateInputValue(new Date(parseDateOnly(day).getTime() + days * DAY_MS))
const weekdayOf = (day: string) => parseDateOnly(day).getUTCDay()

/** Does a repeating series land on this day, by its rule alone? */
function matches(block: SeriesBlock, day: string, startDay: number) {
    const weekday = weekdayOf(day)
    switch (block.repeat) {
        case "daily":
            return true
        case "weekday":
            return weekday >= 1 && weekday <= 5
        case "weekly":
            return block.repeatDays.includes(weekday)
        case "monthly":
            return parseDateOnly(day).getUTCDate() === startDay
        default:
            return false
    }
}

/**
 * Every day the series happens on, from its start up to `until` (inclusive), before exceptions. A cancelled day
 * still counts toward endsAfter, as in RFC 5545, so it's counted here, before exceptions are applied
 */
export function seriesDays(block: SeriesBlock, until: string): string[] {
    const start = dayOf(block.startDate)
    const endsOn = block.endsOn ? dayOf(block.endsOn) : null
    const last = endsOn && endsOn < until ? endsOn : until
    const limit = block.endsAfter ?? Infinity
    if (start > last) return []
    if (block.repeat === "none" || !block.repeat) return [start]

    const days: string[] = []
    const startDay = parseDateOnly(start).getUTCDate()

    if (block.repeat === "monthly") {
        // Month by month, so a series that started years ago costs a few steps, not thousands
        const first = parseDateOnly(start)
        for (let i = 0; days.length < limit; i++) {
            const candidate = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, startDay))
            const day = toDateInputValue(candidate)
            if (day > last) break
            // Date.UTC rolls Feb 31 into March; such a month has no day 31, so it's skipped
            if (candidate.getUTCDate() === startDay) days.push(day)
        }
        return days
    }

    for (let day = start; day <= last && days.length < limit; day = addDays(day, 1)) {
        if (matches(block, day, startDay)) days.push(day)
    }
    return days
}

/** Every block on every day from `from` to `to` (inclusive), with exceptions applied, sorted by day and time */
export function occurrences(blocks: SeriesBlock[], exceptions: Exception[], from: string, to: string): Occurrence[] {
    const byDay = new Map(exceptions.map(e => [`${e.blockId}|${dayOf(e.date)}`, e]))
    const result: Occurrence[] = []

    for (const block of blocks) {
        // A day moved into the range from later on must still be generated
        const movedIn = exceptions
            .filter(e => e.blockId === block.id && e.newDate && dayOf(e.newDate) >= from && dayOf(e.newDate) <= to)
            .map(e => dayOf(e.date))
        const until = movedIn.reduce((latest, day) => (day > latest ? day : latest), to)

        for (const day of seriesDays(block, until)) {
            const change = byDay.get(`${block.id}|${day}`)
            if (change?.cancelled) continue
            const shown = change?.newDate ? dayOf(change.newDate) : day
            if (shown < from || shown > to) continue

            result.push({
                blockId: block.id,
                date: shown,
                originalDate: day,
                startTime: change?.startTime ?? block.startTime,
                endTime: change?.endTime ?? block.endTime,
                label: change?.label ?? block.label,
                category: change?.category ?? block.category,
                repeats: block.repeat !== "none",
                changed: change !== undefined,
            })
        }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
}

/** The block on that day, if it happens then */
export function occursOn(block: SeriesBlock, exceptions: Exception[], day: string): Occurrence | null {
    return occurrences([block], exceptions, day, day)[0] ?? null
}

/** Sunday to Saturday of the week holding `day` */
export function weekDates(day: string): string[] {
    const sunday = addDays(day, -weekdayOf(day))
    return Array.from({ length: 7 }, (_, i) => addDays(sunday, i))
}
