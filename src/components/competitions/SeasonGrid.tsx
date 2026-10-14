import { streak, weekDates, type CompetitionShape, type Season, type WeekState } from "@/lib/competition"
import { formatDateOnly } from "@/lib/dates"

const ROW = 13 // a quarter of a year
const YEAR = 52

const CELL: Record<WeekState, string> = {
    complete: "bg-win text-on-win",
    missed: "bg-danger-tint text-danger-ink",
    current: "bg-cat-tint text-ink ring-2 ring-inset ring-cat-solid motion-safe:animate-[week-beat_2.4s_ease-in-out_infinite]",
    ahead: "bg-sunken text-transparent",
}
const SAY: Record<WeekState, string> = { complete: "complete", missed: "missed", current: "this week", ahead: "ahead" }

/**
 * The season as rows of 13 weeks (a quarter each), labeled with their months; a season longer than a year gets a
 * heading per year. Stays readable from 4 weeks to 156. `popWeek` plays a short pop on a week just completed
 */
export default function SeasonGrid({
    competition,
    season,
    popWeek,
}: {
    competition: CompetitionShape
    season: Season
    popWeek?: number | null
}) {
    const years = Array.from({ length: Math.ceil(competition.weeks / YEAR) }, (_, y) => y)
    const sofar = season.weeks.filter(s => s !== "ahead").length
    const finished = season.weeks.filter(s => s === "complete" || s === "missed").length

    return (
        <div className="space-y-4">
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
                {[
                    [`${season.completedWeeks} / ${competition.weeks}`, "weeks complete"],
                    [String(season.weeks.filter(s => s === "missed").length), "missed"],
                    [String(streak(season.weeks)), "weeks in a row"],
                    [sofar ? `${Math.round((season.completedWeeks / Math.max(finished, 1)) * 100)}%` : "-", "of finished weeks"],
                ].map(([value, label]) => (
                    <div key={label}>
                        <dt className="sr-only">{label}</dt>
                        <dd className="text-2xl font-extrabold tracking-tight tabular-nums text-ink">{value}</dd>
                        <dd aria-hidden="true" className="text-xs text-ink-muted">{label}</dd>
                    </div>
                ))}
            </dl>

            {years.map(year => (
                <div key={year} className="space-y-2">
                    {competition.weeks > YEAR && <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Year {year + 1}</h4>}
                    {[0, 1, 2, 3].map(quarter => {
                        const first = year * YEAR + quarter * ROW + 1
                        if (first > competition.weeks) return null
                        const last = Math.min(first + ROW - 1, competition.weeks)
                        const label = `${formatDateOnly(weekDates(competition, first).from, "MMM")} to ${formatDateOnly(weekDates(competition, last).to, "MMM")}`
                        return (
                            <div key={quarter} className="grid gap-1 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-center sm:gap-3">
                                <span className="text-xs tabular-nums text-ink-muted">{label}</span>
                                <ol aria-label={`Weeks ${first} to ${last}`} className="grid max-w-[34rem] grid-cols-13 gap-1">
                                    {Array.from({ length: ROW }, (_, i) => {
                                        const week = first + i
                                        if (week > competition.weeks) return <li key={i} aria-hidden="true" />
                                        const state = season.weeks[week - 1]
                                        return (
                                            <li
                                                key={i}
                                                title={`Week ${week}, ${formatDateOnly(weekDates(competition, week).from, "MMM d")}: ${SAY[state]}`}
                                                className={`flex aspect-square items-center justify-center rounded-[5px] text-[9px] font-bold tabular-nums ${CELL[state]} ${
                                                    week === popWeek ? "motion-safe:animate-check-pop" : ""
                                                }`}
                                            >
                                                <span className="sr-only">Week {week}: {SAY[state]}</span>
                                                <span aria-hidden="true">{week}</span>
                                            </li>
                                        )
                                    })}
                                </ol>
                            </div>
                        )
                    })}
                </div>
            ))}

            <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-win" />Complete</li>
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-danger-tint" />Missed</li>
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-cat-tint ring-2 ring-inset ring-cat-solid" />This week</li>
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-sunken" />Ahead</li>
            </ul>
        </div>
    )
}
