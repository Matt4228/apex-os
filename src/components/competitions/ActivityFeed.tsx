"use client"

import { format } from "date-fns"
import { Avatar } from "@/components/ui/avatar"
import { LocalDate, useInBrowser } from "@/components/ui/local-date"
import type { Metric } from "@/lib/competition"
import type { ActivityEntry } from "@/lib/competitionData"
import { formatDateOnly, parseDateOnly, toDateInputValue } from "@/lib/dates"
import { amountText, leftText } from "./format"

const DAY_MS = 24 * 60 * 60 * 1000

/** Entries split by the day they were logged, keeping their newest-first order */
export function groupByDay<T extends { createdAt: Date }>(entries: T[], dayOf: (date: Date) => string): { day: string; entries: T[] }[] {
    const groups: { day: string; entries: T[] }[] = []
    for (const entry of entries) {
        const day = dayOf(new Date(entry.createdAt))
        const last = groups[groups.length - 1]
        if (last?.day === day) last.entries.push(entry)
        else groups.push({ day, entries: [entry] })
    }
    return groups
}

/** "Today", "Yesterday", then "Mon, Oct 12" */
export function dayHeading(day: string, today: string): string {
    const daysAgo = Math.round((parseDateOnly(today).getTime() - parseDateOnly(day).getTime()) / DAY_MS)
    if (daysAgo === 0) return "Today"
    if (daysAgo === 1) return "Yesterday"
    return formatDateOnly(day, "EEE, MMM d")
}

/**
 * Everyone's logs, newest first and grouped by day, with their notes: the social side of a competition.
 * Only your own logs from this week can be removed
 */
export default function ActivityFeed({
    entries,
    metrics,
    today,
    thisWeek,
    onDelete,
}: {
    entries: ActivityEntry[]
    metrics: Metric[]
    /** The user's calendar day, "YYYY-MM-DD", for Today and Yesterday */
    today: string
    thisWeek: number | null
    onDelete: (id: string) => void
}) {
    // The server can't know the viewer's timezone, so both renders start from the UTC day, like LocalDate
    const inBrowser = useInBrowser()
    const dayOf = (date: Date) => (inBrowser ? format(date, "yyyy-MM-dd") : toDateInputValue(date))

    return (
        <section aria-labelledby="activity-heading" className="rounded-2xl border border-line bg-surface p-5 space-y-3 min-w-0">
            <h3 id="activity-heading" className="text-[15px] font-semibold text-ink">Activity</h3>
            {entries.length === 0 ? (
                <p className="text-sm text-ink-muted">No logs yet.</p>
            ) : (
                <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                    {groupByDay(entries, dayOf).map(group => (
                        <div key={group.day}>
                            <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">{dayHeading(group.day, today)}</h4>
                            <ul className="space-y-2.5">
                                {group.entries.map(entry => {
                                    const metric = metrics.find(m => m.id === entry.metricId)
                                    const amount = metric ? leftText(entry.amount, metric) : amountText(entry.amount, null)
                                    return (
                                        <li key={entry.id} className="flex items-start gap-2.5 text-sm">
                                            <Avatar name={entry.name} initials={entry.initials} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-ink-soft">
                                                    <span className="break-all font-semibold text-ink">{entry.isYou ? "You" : entry.name.split(" ")[0]}</span>{" "}
                                                    <span>{amount}</span>
                                                </p>
                                                {entry.note && <p className="break-words text-ink-muted">{entry.note}</p>}
                                            </div>
                                            <time className="flex-shrink-0 font-mono text-[11px] text-ink-muted">
                                                <LocalDate date={entry.createdAt} pattern="h:mm a" />
                                            </time>
                                            {entry.isYou && entry.week === thisWeek && (
                                                <button
                                                    onClick={() => onDelete(entry.id)}
                                                    className="flex-shrink-0 text-xs text-ink-muted hover:text-danger-ink"
                                                    aria-label={`Remove ${amountText(entry.amount, metric?.unit ?? null)} from week ${entry.week}`}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
