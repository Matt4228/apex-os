import type { Metric, WeekProgress } from "@/lib/competition"
import { amountText } from "./format"

// The finish line sits at 80% of the lane, so going past the target (up to 125%) has room to show
const FINISH = 0.8

/**
 * One lane per metric toward a finish line; past 100% the lane keeps going, striped. Built from a list so part B
 * can add a lane per competitor
 */
export default function WeekRace({ metrics, progress }: { metrics: Metric[]; progress: WeekProgress }) {
    return (
        <ul className="space-y-4">
            {progress.metrics.map(row => {
                const metric = metrics.find(m => m.id === row.metricId)!
                const shown = Math.min(row.percent, 125)
                const done = row.total >= row.target
                return (
                    <li key={row.metricId} className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-x-3 gap-y-1">
                        <div className="col-span-2 flex justify-between text-sm">
                            <span className="text-ink-soft">{metric.name}</span>
                            <span className="tabular-nums text-ink">
                                {amountText(row.total, null)} of {amountText(row.target, metric.unit)}
                            </span>
                        </div>
                        <div
                            role="progressbar"
                            aria-label={`${metric.name} this week`}
                            aria-valuenow={Math.round(row.percent)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="relative h-7 rounded-full bg-sunken"
                        >
                            {row.percent > 100 && (
                                <span
                                    className="absolute inset-y-1 rounded-r-full bg-[repeating-linear-gradient(135deg,var(--cat-solid)_0_6px,transparent_6px_10px)] opacity-50"
                                    style={{ left: `${FINISH * 100}%`, width: `${(shown - 100) * FINISH}%` }}
                                />
                            )}
                            <span
                                className="absolute inset-y-0 left-0 rounded-full bg-cat-solid motion-safe:animate-[lane-in_1.1s_cubic-bezier(.2,.8,.2,1)_both]"
                                style={{ width: `${Math.min(shown, 100) * FINISH}%` }}
                            />
                            <span
                                aria-hidden="true"
                                className="absolute -inset-y-1.5 w-0.5 bg-[repeating-linear-gradient(var(--color-ink)_0_4px,transparent_4px_8px)] opacity-40"
                                style={{ left: `${FINISH * 100}%` }}
                            />
                        </div>
                        <span className={`text-right font-mono font-semibold tabular-nums ${done ? "text-win-ink" : "text-ink"}`}>
                            {Math.round(row.percent)}%
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}
