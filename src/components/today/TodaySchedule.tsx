"use client"

import Link from "next/link"
import type { PlanBlock } from "@/lib/today"
import { isHappening, useMinutesNow } from "@/lib/useMinutesNow"

export default function TodaySchedule({
    blocks,
    counts = {},
    className = "",
}: {
    blocks: PlanBlock[]
    counts?: Record<string, number>
    className?: string
}) {
    const minutes = useMinutesNow()

    return (
        <section aria-labelledby="schedule-heading" className={className}>
            <div className="flex items-baseline justify-between mb-3">
                <h3 id="schedule-heading" className="text-sm font-semibold text-ink">Schedule</h3>
                <Link href="/dashboard/schedule" className="text-xs text-ink-muted hover:text-ink-soft">
                    Edit
                </Link>
            </div>

            {blocks.length === 0 ? (
                <p className="text-sm text-ink-muted">
                    Nothing scheduled today.{" "}
                    <Link href="/dashboard/schedule" className="text-accent-ink hover:underline">
                        Plan your week
                    </Link>
                </p>
            ) : (
                <ol className="space-y-0.5">
                    {blocks.map(block => {
                        const current = isHappening(block, minutes)
                        const count = counts[block.id] ?? 0
                        return (
                            <li
                                key={block.id}
                                aria-current={current ? "time" : undefined}
                                className={`relative flex gap-3 rounded-md px-2 py-1.5 text-sm ${
                                    current
                                        ? "bg-sunken text-ink font-medium before:absolute before:left-0 before:inset-y-1 before:w-0.5 before:rounded-full before:bg-primary-ink"
                                        : "text-ink-soft"
                                }`}
                            >
                                <span className="w-11 flex-shrink-0 pt-px text-xs text-ink-muted tabular-nums">
                                    {block.startTime}
                                    <span className="sr-only"> to </span>
                                    <span className="block">{block.endTime}</span>
                                </span>
                                <span className="min-w-0">{block.label}</span>
                                {count > 0 && (
                                    // The number is for the eye; screen readers hear "2 tasks"
                                    <span className="ml-auto flex-shrink-0 pt-px text-xs font-normal text-ink-muted tabular-nums">
                                        <span aria-hidden="true">{count}</span>
                                        <span className="sr-only">{count === 1 ? "1 task" : `${count} tasks`}</span>
                                    </span>
                                )}
                            </li>
                        )
                    })}
                </ol>
            )}
        </section>
    )
}