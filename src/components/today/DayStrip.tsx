"use client"

import { catProps, uniqueCategories } from "@/lib/categoryColor"
import { stripLayout } from "@/lib/dayStrip"
import type { PlanBlock } from "@/lib/today"
import { useMinutesNow } from "@/lib/useMinutesNow"

/** 390 minutes reads "06:30" */
const clock = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/**
 * Today's blocks on one lane, colored by category, with a mark at the current time: the whole day at a glance.
 * The schedule rail stays the list a screen reader reads; the lane only describes its span
 */
export default function DayStrip({ blocks, className = "" }: { blocks: PlanBlock[]; className?: string }) {
    const minutes = useMinutesNow()
    const layout = stripLayout(blocks)
    if (!layout) return null

    const span = layout.end - layout.start
    const at = (time: number) => ((time - layout.start) / span) * 100
    const byId = new Map(blocks.map(block => [block.id, block]))
    const now = minutes !== null && minutes >= layout.start && minutes <= layout.end ? at(minutes) : null
    const legend = uniqueCategories(blocks.map(block => block.category))

    return (
        <div className={className}>
            <div
                role="img"
                aria-label={`Today's schedule, ${clock(layout.start)} to ${clock(layout.end)}`}
                className="relative h-7 rounded-lg bg-sunken"
            >
                {layout.bars.map(bar => {
                    const block = byId.get(bar.id)!
                    return (
                        <span
                            key={bar.id}
                            {...catProps(block.category)}
                            title={`${block.startTime} to ${block.endTime} ${block.label}`}
                            className="absolute inset-y-1 rounded-md bg-cat-solid"
                            style={{ left: `${bar.left}%`, width: `calc(${bar.width}% - 2px)` }}
                        />
                    )
                })}
                {now !== null && (
                    <span data-testid="now-mark" className="absolute -inset-y-1 w-0.5 rounded-full bg-ink" style={{ left: `${now}%` }} />
                )}
            </div>

            <div aria-hidden="true" className="relative mt-1 h-4 text-[11px] tabular-nums text-ink-muted">
                {layout.ticks.map(tick => (
                    <span
                        key={tick}
                        className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                        style={{ left: `${at(tick)}%` }}
                    >
                        {clock(tick)}
                    </span>
                ))}
            </div>

            {legend.length > 0 && (
                <ul aria-label="Categories" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
                    {legend.map(name => (
                        <li key={name} {...catProps(name)} className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cat-solid" />
                            {name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
