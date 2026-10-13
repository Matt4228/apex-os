"use client"

import Link from "next/link"
import { catProps } from "@/lib/categoryColor"
import type { BlockProgress, PlanBlock } from "@/lib/today"
import { isHappening, useMinutesNow } from "@/lib/useMinutesNow"

export default function TodaySchedule({
    blocks,
    progress = {},
    className = "",
}: {
    blocks: PlanBlock[]
    progress?: Record<string, BlockProgress>
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
                // Each block tinted with its category, like an event on a calendar; the one happening now is outlined
                <ol className="space-y-1">
                    {blocks.map(block => {
                        const current = isHappening(block, minutes)
                        const tasks = progress[block.id]
                        return (
                            <li
                                key={block.id}
                                {...catProps(block.category)}
                                aria-current={current ? "time" : undefined}
                                className={`flex gap-3 rounded-md bg-cat-tint px-2 py-1.5 text-sm text-cat-ink ${
                                    current ? "ring-2 ring-inset ring-cat-solid font-medium" : ""
                                }`}
                            >
                                <span className="w-11 flex-shrink-0 pt-px text-xs tabular-nums">
                                    {block.startTime}
                                    <span className="sr-only"> to </span>
                                    <span className="block">{block.endTime}</span>
                                </span>
                                <span className="min-w-0">
                                    {block.label}
                                    {tasks && (
                                        <span
                                            className={`block text-xs font-normal tabular-nums ${
                                                tasks.done === tasks.total ? "text-success-ink" : ""
                                            }`}
                                        >
                                            {tasks.done} of {tasks.total} done
                                        </span>
                                    )}
                                </span>
                            </li>
                        )
                    })}
                </ol>
            )}
        </section>
    )
}