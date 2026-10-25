import { Avatar } from "@/components/ui/avatar"
import type { Standing } from "@/lib/standings"
import { CELL, SAY } from "./SeasonGrid"

const ROW = 13 // a quarter of a year, the same rhythm as the season grid

/**
 * The season as a leaderboard: everyone in rank order (most completed weeks, then total progress), each with their
 * weeks as squares in rows of 13, so a year-long season is four short rows per person. Your row is shaded
 */
export default function SeasonBoard({ weeks, standings, popWeek }: { weeks: number; standings: Standing[]; popWeek?: number | null }) {
    const rows = Array.from({ length: Math.ceil(weeks / ROW) }, (_, r) => r * ROW)

    return (
        <div className="space-y-3">
            <ol aria-label="Season standings" className="space-y-1">
                {standings.map(row => {
                    const name = row.isYou ? "You" : row.name.split(" ")[0]
                    return (
                        <li
                            key={row.participantId}
                            aria-label={`${row.place} ${name}`}
                            data-you={row.isYou || undefined}
                            className={`grid grid-cols-[1.25rem_auto_minmax(0,1fr)_auto] items-start gap-x-3 rounded-xl px-2 py-2 ${row.isYou ? "bg-sunken" : ""}`}
                        >
                            <span className="pt-1 text-center font-extrabold text-ink-muted tabular-nums">{row.place}</span>
                            <Avatar name={row.name} initials={row.initials} size="sm" />
                            <div className="min-w-0">
                                <p className={`truncate text-sm ${row.isYou ? "font-bold text-ink" : "font-semibold text-ink-soft"}`}>{name}</p>
                                <div className="mt-1 space-y-1">
                                    {rows.map(first => (
                                        <div key={first} data-testid="week-row" className="grid max-w-[22rem] grid-cols-13 gap-[3px]">
                                            {Array.from({ length: Math.min(ROW, weeks - first) }, (_, i) => {
                                                const week = first + i + 1
                                                const state = row.season.weeks[week - 1] ?? "ahead"
                                                return (
                                                    <span
                                                        key={week}
                                                        role="img"
                                                        aria-label={`Week ${week}: ${SAY[state]}`}
                                                        title={`Week ${week}: ${SAY[state]}`}
                                                        className={`aspect-square rounded-[4px] ${CELL[state]} ${row.isYou && week === popWeek ? "motion-safe:animate-check-pop" : ""}`}
                                                    />
                                                )
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right tabular-nums">
                                <p className="text-base font-extrabold tracking-tight text-ink">{row.season.completedWeeks} / {weeks}</p>
                                <p className="text-[11px] text-ink-muted">{Math.round(row.season.totalProgress)}% total</p>
                            </div>
                        </li>
                    )
                })}
            </ol>
            <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-win" />Complete</li>
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-danger-tint" />Missed</li>
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-cat-tint ring-2 ring-inset ring-cat-solid" />This week</li>
                <li className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-sunken" />Ahead</li>
            </ul>
        </div>
    )
}
