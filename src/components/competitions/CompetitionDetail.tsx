"use client"

import { useState } from "react"
import { deleteLog, logProgress, updateFutureTargets } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProgressBar } from "@/components/ui/progress-bar"
import { catProps } from "@/lib/categoryColor"
import { lastDay, season, weekDates, weekProgress } from "@/lib/competition"
import type { CompetitionView } from "@/lib/competitionData"
import { formatDateOnly } from "@/lib/dates"
import { failureMessage } from "@/lib/optimistic"
import SeasonPips from "./SeasonPips"

const selectClass = "h-10 w-full rounded-md border border-line bg-surface px-2 text-sm text-ink"

/** "12.5 km" or "3": a number with its metric's unit */
const amount = (value: number, unit: string | null) => `${Math.round(value * 10) / 10}${unit ? ` ${unit}` : ""}`

/** One competition: this week, logging, the season so far, the weekly targets, and your recent logs */
export default function CompetitionDetail({ competition }: { competition: CompetitionView }) {
    const [logs, setLogs] = useState(competition.logs)
    const [targets, setTargets] = useState(competition.targets)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [metricId, setMetricId] = useState(competition.metrics[0]?.id ?? "")
    const [logAmount, setLogAmount] = useState("")
    const [note, setNote] = useState("")
    const [drafts, setDrafts] = useState<Record<string, string>>({})

    const { position, metrics } = competition
    const thisWeek = position.state === "active" ? position.week : null
    const progress = thisWeek ? weekProgress(metrics, targets, logs, thisWeek) : null
    const seasonNow = season(metrics, targets, logs, competition, position)
    const firstEditable = position.state === "upcoming" ? 1 : thisWeek ? thisWeek + 1 : Infinity
    const metricOf = (id: string) => metrics.find(m => m.id === id)

    const status =
        position.state === "active"
            ? `Week ${position.week} of ${competition.weeks}, ${formatDateOnly(weekDates(competition, position.week).from, "MMM d")} to ${formatDateOnly(weekDates(competition, position.week).to, "MMM d")}`
            : position.state === "upcoming"
              ? `Starts ${formatDateOnly(competition.startDate, "EEEE, MMM d")}`
              : `Finished ${formatDateOnly(lastDay(competition), "MMM d")}`

    async function handleLog(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setNotice(null)
        const formData = new FormData()
        formData.set("metricId", metricId)
        formData.set("amount", logAmount)
        formData.set("note", note)

        const wasComplete = progress?.complete ?? false
        const result = await logProgress(competition.id, formData)
        if (!result || "error" in result) {
            setError(result?.error ?? "Something went wrong")
            return
        }
        if (!result.log) return
        const next = [result.log, ...logs]
        setLogs(next)
        setLogAmount("")
        setNote("")
        if (thisWeek && !wasComplete && weekProgress(metrics, targets, next, thisWeek).complete) {
            setNotice(`Week ${thisWeek} complete.`)
        }
    }

    async function handleDeleteLog(id: string) {
        setError(null)
        const before = logs
        setLogs(current => current.filter(l => l.id !== id))
        const problem = await failureMessage(deleteLog(id), "remove that log")
        if (problem) {
            setLogs(before)
            setError(problem)
        }
    }

    async function saveTargets() {
        setError(null)
        const changed = Object.entries(drafts).map(([key, value]) => {
            const [id, week] = key.split("|")
            return { metricId: id, week: Number(week), target: Number(value) }
        })
        if (changed.length === 0) return
        const problem = await failureMessage(updateFutureTargets(competition.id, changed), "save the targets")
        if (problem) {
            setError(problem)
            return
        }
        setTargets(current => [
            ...current.filter(t => !changed.some(c => c.metricId === t.metricId && c.week === t.week)),
            ...changed,
        ])
        setDrafts({})
        setNotice("Targets saved.")
    }

    return (
        <div {...catProps(competition.category)} className="space-y-8">
            <header>
                <h2 className="text-2xl font-semibold text-ink">{competition.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{status}</p>
            </header>

            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
            {notice && <p role="status" className="text-sm font-medium text-ink">{notice}</p>}

            {progress && thisWeek && (
                <section aria-labelledby="this-week" className="space-y-4">
                    <h3 id="this-week" className="text-sm font-semibold text-ink">
                        This week {progress.complete && <span className="ml-1 text-warning-ink">Complete</span>}
                    </h3>
                    <ul className="space-y-3">
                        {progress.metrics.map(row => {
                            const metric = metricOf(row.metricId)!
                            return (
                                <li key={row.metricId} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-ink-soft">{metric.name}</span>
                                        <span className="tabular-nums text-ink">
                                            {amount(row.total, metric.unit)} of {amount(row.target, metric.unit)} &middot; {Math.round(row.percent)}%
                                        </span>
                                    </div>
                                    <ProgressBar percent={Math.min(row.percent, 100)} label={`${metric.name} this week`} tone="category" />
                                </li>
                            )
                        })}
                    </ul>

                    <form onSubmit={handleLog} className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3">
                        <label className="w-40 space-y-1">
                            <span className="text-xs text-ink-muted">Metric</span>
                            <select value={metricId} onChange={e => setMetricId(e.target.value)} className={selectClass}>
                                {metrics.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="w-28 space-y-1">
                            <span className="text-xs text-ink-muted">Amount</span>
                            <Input type="number" min={0} step="any" value={logAmount} onChange={e => setLogAmount(e.target.value)} required />
                        </label>
                        <label className="min-w-40 flex-1 space-y-1">
                            <span className="text-xs text-ink-muted">Note (optional)</span>
                            <Input value={note} onChange={e => setNote(e.target.value)} maxLength={200} />
                        </label>
                        <Button type="submit">Log it</Button>
                    </form>
                </section>
            )}

            <section aria-labelledby="season" className="space-y-2">
                <h3 id="season" className="text-sm font-semibold text-ink">Season</h3>
                <SeasonPips weeks={seasonNow.weeks} label="Weeks" />
                <p className="text-sm text-ink-soft">
                    {seasonNow.completedWeeks} of {competition.weeks} weeks complete &middot; {Math.round(seasonNow.totalProgress)}% total progress
                </p>
            </section>

            <section aria-labelledby="targets" className="space-y-2">
                <h3 id="targets" className="text-sm font-semibold text-ink">Weekly targets</h3>
                <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-xs text-ink-muted">
                                <th scope="col" className="px-3 py-2 text-left font-medium">Metric</th>
                                {Array.from({ length: competition.weeks }, (_, w) => (
                                    <th key={w} scope="col" className={`px-2 py-2 font-medium ${w + 1 === thisWeek ? "text-ink" : ""}`}>
                                        Week {w + 1}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.map(m => (
                                <tr key={m.id} className="border-t border-line">
                                    <th scope="row" className="px-3 py-2 text-left font-normal text-ink-soft">{m.name}</th>
                                    {Array.from({ length: competition.weeks }, (_, w) => {
                                        const week = w + 1
                                        const target = targets.find(t => t.metricId === m.id && t.week === week)?.target ?? 0
                                        const key = `${m.id}|${week}`
                                        return (
                                            <td key={w} className={`px-2 py-1.5 text-center tabular-nums ${week === thisWeek ? "bg-sunken font-semibold" : week < firstEditable ? "text-ink-muted" : ""}`}>
                                                {competition.isOwner && week >= firstEditable ? (
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="any"
                                                        aria-label={`${m.name}, week ${week}`}
                                                        value={drafts[key] ?? String(target)}
                                                        onChange={e => setDrafts(current => ({ ...current, [key]: e.target.value }))}
                                                        className="h-8 w-16 text-center"
                                                    />
                                                ) : (
                                                    target
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {Object.keys(drafts).length > 0 && (
                    <Button size="sm" onClick={saveTargets}>Save targets</Button>
                )}
            </section>

            <section aria-labelledby="recent" className="space-y-2">
                <h3 id="recent" className="text-sm font-semibold text-ink">Your logs</h3>
                {logs.length === 0 ? (
                    <p className="text-sm text-ink-muted">Nothing logged yet.</p>
                ) : (
                    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                        {logs.slice(0, 20).map(log => {
                            const metric = metricOf(log.metricId)
                            return (
                                <li key={log.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                                    <span className="w-16 text-xs text-ink-muted">Week {log.week}</span>
                                    <span className="flex-1 text-ink">
                                        {amount(log.amount, metric?.unit ?? null)} {metric?.unit ? "" : metric?.name}
                                        {log.note && <span className="text-ink-muted"> &middot; {log.note}</span>}
                                    </span>
                                    {log.week === thisWeek && (
                                        <button
                                            onClick={() => handleDeleteLog(log.id)}
                                            className="text-xs text-ink-muted hover:text-danger-ink"
                                            aria-label={`Remove ${amount(log.amount, metric?.unit ?? null)} from week ${log.week}`}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </div>
    )
}
