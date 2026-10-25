import { Check } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { catProps } from "@/lib/categoryColor"
import type { Metric, MetricProgress, Target } from "@/lib/competition"
import { raceGaps, raceOrder, type Standing } from "@/lib/standings"
import { amountText, leftText } from "./format"

// The finish line sits at 80% of the bar, so going past the target (up to 125%) has room to show
const FINISH = 0.8

/** One goal's thin bar toward the finish line, striped past it */
function GoalBar({ row }: { row: MetricProgress }) {
    const shown = Math.min(row.percent, 125)
    return (
        <span aria-hidden="true" className="relative block h-2 min-w-16 rounded-full bg-sunken">
            {row.percent > 100 && (
                <span
                    className="absolute inset-y-0.5 rounded-r-full bg-[repeating-linear-gradient(135deg,var(--cat-solid)_0_6px,transparent_6px_10px)] opacity-50"
                    style={{ left: `${FINISH * 100}%`, width: `${(shown - 100) * FINISH}%` }}
                />
            )}
            <span
                className="absolute inset-y-0 left-0 rounded-full bg-cat-solid motion-safe:animate-[lane-in_1.1s_cubic-bezier(.2,.8,.2,1)_both]"
                style={{ width: `${Math.min(shown, 100) * FINISH}%` }}
            />
            <span
                className="absolute -inset-y-1 w-0.5 bg-[repeating-linear-gradient(var(--color-ink)_0_3px,transparent_3px_6px)] opacity-40"
                style={{ left: `${FINISH * 100}%` }}
            />
        </span>
    )
}

/** Under the grid: what you still need, and the gap to the people either side of you in the race */
function nudge(order: Standing[], metrics: Metric[], week: number): string {
    const you = order.find(r => r.isYou)
    if (!you?.week) return ""
    const left = you.week.metrics
        .filter(m => m.total < m.target)
        .map(m => leftText(m.target - m.total, metrics.find(x => x.id === m.metricId)!))
    const first = you.week.complete ? `Week ${week} done.` : `${left.join(" and ")} to finish the week.`

    const { ahead, behind } = raceGaps(order)
    const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`
    // The person behind, after a clause about the person ahead: "; Alex is 12 points behind" or "; you're level with Alex"
    const andBehind = !behind ? "" : behind.points === 0 ? `; you're level with ${behind.name}` : `; ${behind.name} is ${points(behind.points)} behind`
    let gaps = ""
    if (ahead && ahead.points === 0) gaps = behind?.points === 0 ? `You're level with ${ahead.name} and ${behind.name}.` : `You're level with ${ahead.name}${andBehind}.`
    else if (ahead) gaps = `${ahead.name} is ${points(ahead.points)} ahead${andBehind}.`
    else if (behind) gaps = behind.points === 0 ? `You're level with ${behind.name}.` : `You lead ${behind.name} by ${points(behind.points)}.`
    return gaps ? `${first} ${gaps}` : first
}

/**
 * This week as a scoreboard: a row per person, ranked by this week's progress (each goal counting at most 100%), a
 * column per goal with a bar and the amount, then the week's percent. Your row is shaded. On a phone the goals stack
 * under each name
 */
export default function RaceGrid({ metrics, targets, week, standings }: { metrics: Metric[]; targets: Target[]; week: number; standings: Standing[] }) {
    const order = raceOrder(standings)
    const targetOf = (metricId: string) => targets.find(t => t.metricId === metricId && t.week === week)?.target ?? 0
    const line = nudge(order, metrics, week)

    return (
        <div className="space-y-3">
            {/* The roles are spelled out because display: block on a phone makes browsers drop the table's own */}
            <table role="table" aria-label="This week's race" className="w-full border-collapse text-sm max-md:block">
                <thead role="rowgroup" className="max-md:hidden">
                    <tr role="row" className="text-left text-xs text-ink-muted">
                        <th role="columnheader" className="w-6 px-1.5 py-1 font-medium"><span className="sr-only">Place</span></th>
                        <th role="columnheader" className="px-1.5 py-1 font-medium"><span className="sr-only">Person</span></th>
                        {metrics.map(m => (
                            <th key={m.id} role="columnheader" className="px-1.5 py-1 font-medium">
                                {m.name} <span className="text-ink-muted/70">/ {amountText(targetOf(m.id), null)}</span>
                            </th>
                        ))}
                        <th role="columnheader" className="px-1.5 py-1 text-right font-medium">Week</th>
                    </tr>
                </thead>
                <tbody role="rowgroup" className="max-md:block max-md:space-y-1">
                    {order.map(row => {
                        const name = row.isYou ? "You" : row.name.split(" ")[0]
                        // People on the same shown percent share a number: 1, 2, 2 (everyone at 0% on Sunday is 1st)
                        const place = order.findIndex(r => Math.round(r.race) === Math.round(row.race)) + 1
                        return (
                            <tr
                                key={row.participantId}
                                role="row"
                                aria-label={`${place} ${name}`}
                                data-you={row.isYou || undefined}
                                {...catProps(row.name)}
                                className={`border-t border-line max-md:grid max-md:grid-cols-[1.5rem_minmax(0,1fr)_auto] max-md:gap-x-2 max-md:rounded-lg max-md:border-0 max-md:p-2 ${row.isYou ? "bg-sunken" : ""}`}
                            >
                                <td role="cell" className="px-1.5 py-2.5 font-extrabold text-ink-muted tabular-nums max-md:p-0">{place}</td>
                                <th scope="row" role="rowheader" className="px-1.5 py-2.5 text-left font-normal max-md:p-0">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <Avatar name={row.name} initials={row.initials} size="sm" />
                                        <span className={`max-w-28 truncate ${row.isYou ? "font-bold text-ink" : "text-ink-soft"}`}>{name}</span>
                                    </span>
                                </th>
                                {row.week?.metrics.map(goal => {
                                    const metric = metrics.find(m => m.id === goal.metricId)!
                                    const done = goal.target > 0 && goal.total >= goal.target
                                    return (
                                        <td key={goal.metricId} role="cell" className="px-1.5 py-2.5 align-middle max-md:col-span-3 max-md:col-start-2 max-md:row-start-auto max-md:p-0 max-md:pt-1.5">
                                            <span className="mb-0.5 hidden text-xs text-ink-muted max-md:block">{metric.name}</span>
                                            <GoalBar row={goal} />
                                            <span className="mt-1 flex items-center gap-1 font-mono text-[11px] text-ink-muted">
                                                <span>{metric.unit ? amountText(goal.total, metric.unit) : `${amountText(goal.total, null)} of ${amountText(goal.target, null)}`}</span>
                                                {done && <Check size={12} role="img" aria-label="Done" className="text-win-ink" />}
                                            </span>
                                        </td>
                                    )
                                })}
                                <td role="cell" className="px-1.5 py-2.5 text-right font-mono text-[15px] font-bold tabular-nums max-md:col-start-3 max-md:row-start-1 max-md:p-0">
                                    <span className={row.week?.complete ? "text-win-ink" : "text-ink"}>{Math.round(row.race)}%</span>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            {line && <p className="rounded-lg bg-win/15 px-3 py-2 text-sm text-ink-soft">{line}</p>}
        </div>
    )
}
