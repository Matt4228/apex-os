"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"

type Block = { id: string; startTime: string; endTime: string; label: string }

const minutesOf = (hhmm: string) => {
    const [hours, minutes] = hhmm.split(":").map(Number)
    return hours * 60 + minutes
}

// The clock as an external store: re-read every 30 seconds, and unknown on the server
function subscribe(onChange: () => void) {
    const id = setInterval(onChange, 30_000)
    return () => clearInterval(id)
}
const nowInMinutes = () => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
}
const unknownOnServer = () => null

export default function TodaySchedule({ blocks, className = "" }: { blocks: Block[]; className?: string }) {
    // Null during server rendering, so the server and the browser agree on the first render
    const minutes = useSyncExternalStore(subscribe, nowInMinutes, unknownOnServer)

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
                        const current =
                            minutes !== null && minutes >= minutesOf(block.startTime) && minutes < minutesOf(block.endTime)
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
                                <span className="w-11 flex-shrink-0 pt-px text-xs text-ink-muted tabular-nums">{block.startTime}</span>
                                <span className="min-w-0">{block.label}</span>
                            </li>
                        )
                    })}
                </ol>
            )}
        </section>
    )
}