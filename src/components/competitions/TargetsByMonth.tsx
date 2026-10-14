import { Input } from "@/components/ui/input"
import { monthGroups, type CompetitionShape, type Metric, type Target } from "@/lib/competition"
import { formatDateOnly } from "@/lib/dates"
import { amountText } from "./format"

/**
 * Every week's targets, folded by month so even three years stays short. The current month is open; each closed
 * month sums up its range ("km run 24 to 30 km"). The owner can type new targets for weeks that haven't started
 */
export default function TargetsByMonth({
    competition,
    metrics,
    targets,
    thisWeek,
    firstEditable,
    editable,
    drafts,
    onDraft,
}: {
    competition: CompetitionShape
    metrics: Metric[]
    targets: Target[]
    thisWeek: number | null
    firstEditable: number
    editable: boolean
    drafts: Record<string, string>
    onDraft: (key: string, value: string) => void
}) {
    const targetOf = (metricId: string, week: number) => targets.find(t => t.metricId === metricId && t.week === week)?.target ?? 0

    return (
        <div className="space-y-1.5">
            {monthGroups(competition).map(({ month, weeks }) => {
                const isNow = thisWeek !== null && weeks.includes(thisWeek)
                const past = thisWeek !== null && weeks[weeks.length - 1] < thisWeek
                const summary = metrics
                    .map(m => {
                        const values = weeks.map(w => targetOf(m.id, w))
                        const low = Math.min(...values)
                        const high = Math.max(...values)
                        return `${m.name} ${low === high ? amountText(low, m.unit) : `${amountText(low, null)} to ${amountText(high, m.unit)}`}`
                    })
                    .join(" · ")
                return (
                    <details key={month} open={isNow} className="group rounded-xl border border-line bg-surface open:bg-sunken">
                        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2.5 sm:grid-cols-[7rem_minmax(0,1fr)_auto] [&::-webkit-details-marker]:hidden">
                            <span className="font-semibold text-ink">
                                {formatDateOnly(`${month}-01`, "MMMM")} <span className="font-normal text-ink-muted">{month.slice(0, 4)}</span>
                            </span>
                            <span className="order-last col-span-2 text-sm tabular-nums text-ink-soft sm:order-none sm:col-span-1">{summary}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isNow ? "bg-cat-tint text-ink" : "bg-sunken text-ink-muted"}`}>
                                {isNow ? "This month" : past ? "Done" : `Weeks ${weeks[0]} to ${weeks[weeks.length - 1]}`}
                            </span>
                        </summary>
                        <div className="overflow-x-auto px-3 pb-3">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-ink-muted">
                                        <th scope="col" className="py-1.5 text-left font-medium"><span className="sr-only">Metric</span></th>
                                        {weeks.map(w => (
                                            <th key={w} scope="col" className={`px-2 py-1.5 font-medium ${w === thisWeek ? "text-ink" : ""}`}>
                                                Week {w}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.map(m => (
                                        <tr key={m.id} className="border-t border-line">
                                            <th scope="row" className="py-1.5 text-left font-normal text-ink-muted">{m.name}</th>
                                            {weeks.map(w => {
                                                const key = `${m.id}|${w}`
                                                return (
                                                    <td key={w} className="px-2 py-1.5 text-center tabular-nums">
                                                        {editable && w >= firstEditable ? (
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                step="any"
                                                                aria-label={`${m.name}, week ${w}`}
                                                                value={drafts[key] ?? String(targetOf(m.id, w))}
                                                                onChange={e => onDraft(key, e.target.value)}
                                                                className="mx-auto h-8 w-16 text-center"
                                                            />
                                                        ) : (
                                                            <span className={w === thisWeek ? "font-semibold text-ink" : "text-ink-muted"}>{targetOf(m.id, w)}</span>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>
                )
            })}
        </div>
    )
}
