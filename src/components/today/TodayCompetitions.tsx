import Link from "next/link"
import { leftText } from "@/components/competitions/format"
import { ProgressRing } from "@/components/ui/progress-ring"
import { catProps } from "@/lib/categoryColor"
import { daysLeft, weekProgress } from "@/lib/competition"
import type { CompetitionView } from "@/lib/competitionData"

/**
 * The competitions running this week, in Today's rail: each one's week, a ring for this week's progress, and what's
 * left to finish it, with a link to log. Competitions are one of the places tasks come from, so they belong here.
 * Nothing shows when none are running
 */
export default function TodayCompetitions({
    competitions,
    today,
    className = "",
}: {
    competitions: CompetitionView[]
    today: string
    className?: string
}) {
    const running = competitions.filter(c => c.position.state === "active")
    if (running.length === 0) return null

    return (
        <section aria-labelledby="competitions-heading" className={className}>
            <div className="mb-3 flex items-baseline justify-between">
                <h3 id="competitions-heading" className="text-sm font-semibold text-ink">This week&apos;s competitions</h3>
                <Link href="/dashboard/competitions" className="text-xs text-ink-muted hover:text-ink-soft">
                    All
                </Link>
            </div>

            <ul className="space-y-2">
                {running.map(c => {
                    if (c.position.state !== "active") return null
                    const week = c.position.week
                    const progress = weekProgress(c.metrics, c.targets, c.logs, week)
                    const left = progress.metrics
                        .filter(m => m.total < m.target)
                        .map(m => {
                            const metric = c.metrics.find(x => x.id === m.metricId)!
                            return leftText(m.target - m.total, metric)
                        })
                    const days = daysLeft(c, week, today)
                    return (
                        // A white card with the category's border: the ring's track is the category tint, so a tinted card would hide it
                        <li key={c.id} {...catProps(c.category)} className="flex items-center gap-3 rounded-lg border border-cat-line bg-surface px-2.5 py-2">
                            <ProgressRing percent={Math.round(progress.percent)} label={`${c.title} this week`} size={44} />
                            <div className="min-w-0 flex-1">
                                <Link href={`/dashboard/competitions/${c.id}`} className="block truncate text-sm font-semibold text-ink hover:underline">
                                    {c.title}
                                </Link>
                                <p className="text-xs text-ink-muted">
                                    Week {week} of {c.weeks} &middot; {days} {days === 1 ? "day" : "days"} left
                                </p>
                                <p className="truncate text-xs text-cat-ink">
                                    {progress.complete ? <b className="font-semibold">Week complete</b> : `${left.join(", ")} to go`}
                                </p>
                            </div>
                            <Link
                                href={`/dashboard/competitions/${c.id}`}
                                aria-label={`Log progress for ${c.title}`}
                                className="rounded-md px-2 py-1 text-xs font-semibold text-accent-ink hover:bg-sunken"
                            >
                                Log
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
