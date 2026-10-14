import type { WeekState } from "@/lib/competition"

const STYLE: Record<WeekState, string> = {
    complete: "bg-warning text-ink",
    missed: "bg-danger-tint text-danger-ink",
    current: "bg-sunken text-ink ring-2 ring-inset ring-primary-ink",
    ahead: "bg-sunken text-ink-muted",
}

const SAY: Record<WeekState, string> = { complete: "complete", missed: "missed", current: "this week", ahead: "ahead" }

/** One square per week: complete, missed, this week, or ahead */
export default function SeasonPips({ weeks, label }: { weeks: WeekState[]; label: string }) {
    return (
        <ol aria-label={label} className="flex flex-wrap gap-1">
            {weeks.map((state, i) => (
                <li
                    key={i}
                    title={`Week ${i + 1}: ${SAY[state]}`}
                    className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums ${STYLE[state]}`}
                >
                    <span className="sr-only">Week {i + 1}: {SAY[state]}</span>
                    <span aria-hidden="true">{i + 1}</span>
                </li>
            ))}
        </ol>
    )
}
