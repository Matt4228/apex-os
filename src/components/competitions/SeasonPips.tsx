import type { WeekState } from "@/lib/competition"

const STYLE: Record<WeekState, string> = {
    complete: "bg-win text-on-win",
    missed: "bg-danger-tint text-danger-ink",
    current: "bg-sunken text-ink ring-2 ring-inset ring-primary-ink",
    ahead: "bg-sunken text-ink-muted",
}

const SAY: Record<WeekState, string> = { complete: "complete", missed: "missed", current: "this week", ahead: "ahead" }

const SLIVER: Record<WeekState, string> = {
    complete: "bg-win",
    missed: "bg-danger-tint",
    current: "bg-cat-solid",
    ahead: "bg-sunken",
}

// Past half a year, numbered squares stop fitting a card, so the season becomes one thin bar of slivers
const SQUARES_UP_TO = 26

/** One square per week (complete, missed, this week, ahead), or for long seasons one sliver per week */
export default function SeasonPips({ weeks, label }: { weeks: WeekState[]; label: string }) {
    if (weeks.length > SQUARES_UP_TO) {
        const count = (state: WeekState) => weeks.filter(w => w === state).length
        return (
            <div
                role="img"
                aria-label={`${label}: ${count("complete")} complete, ${count("missed")} missed, ${count("ahead")} ahead`}
                className="flex h-2.5 gap-px overflow-hidden rounded-full"
            >
                {weeks.map((state, i) => <span key={i} className={`flex-1 ${SLIVER[state]}`} />)}
            </div>
        )
    }
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
