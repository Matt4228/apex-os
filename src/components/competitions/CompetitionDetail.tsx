"use client"

import { useState } from "react"
import { deleteLog, logProgress, updateFutureTargets } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { catProps } from "@/lib/categoryColor"
import { daysLeft, lastDay, quickAmounts, season, weekDates, weekProgress } from "@/lib/competition"
import type { CompetitionDetailView } from "@/lib/competitionData"
import { formatDateOnly } from "@/lib/dates"
import { failureMessage } from "@/lib/optimistic"
import { standings } from "@/lib/standings"
import { useRefreshOnFocus } from "@/lib/useRefreshOnFocus"
import ActivityFeed from "./ActivityFeed"
import CompetitionHero from "./CompetitionHero"
import PeoplePanel from "./PeoplePanel"
import RaceGrid from "./RaceGrid"
import type { Person } from "@/lib/friends"
import SeasonGrid from "./SeasonGrid"
import TargetsByMonth from "./TargetsByMonth"
import { amountText } from "./format"

const card = "rounded-2xl border border-line bg-surface p-5 space-y-4 min-w-0"
const selectClass = "h-10 w-full rounded-md border border-line bg-surface px-2 text-sm text-ink"

/**
 * One competition, the second centerpiece next to Today: the standing, this week's race, logging, everyone's
 * activity, the season and the weekly targets. Everything is scored in the browser with the same functions as the server
 */
export default function CompetitionDetail({
    competition,
    today,
    friends = [],
    origin = "",
}: {
    competition: CompetitionDetailView
    today: string
    /** The owner's friends, for inviting */
    friends?: Person[]
    /** The site's address, for the invite link */
    origin?: string
}) {
    const [logs, setLogs] = useState(competition.logs)
    const [activity, setActivity] = useState(competition.activity)
    const [targets, setTargets] = useState(competition.targets)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [popWeek, setPopWeek] = useState<number | null>(null)
    const [metricId, setMetricId] = useState(competition.metrics[0]?.id ?? "")
    const [logAmount, setLogAmount] = useState("")
    const [note, setNote] = useState("")
    const [drafts, setDrafts] = useState<Record<string, string>>({})

    // Coming back to the tab reloads the data; adopt it during render, leaving what you were typing alone
    useRefreshOnFocus()
    const [seen, setSeen] = useState(competition.loadedAt)
    if (competition.loadedAt !== seen) {
        setSeen(competition.loadedAt)
        setLogs(competition.logs)
        setActivity(competition.activity)
        setTargets(competition.targets)
    }

    const { position, metrics } = competition
    const thisWeek = position.state === "active" ? position.week : null
    const progress = thisWeek ? weekProgress(metrics, targets, logs, thisWeek) : null
    const seasonNow = season(metrics, targets, logs, competition, position)
    // Everyone scored the same way, with your own logs swapped in so a new log moves you at once
    const ranked = standings({ metrics, targets, competitors: competition.competitors, myLogs: logs, competition, position })
    const firstEditable = position.state === "upcoming" ? 1 : thisWeek ? thisWeek + 1 : Infinity
    const metricOf = (id: string) => metrics.find(m => m.id === id)
    const selectedTarget = thisWeek ? targets.find(t => t.metricId === metricId && t.week === thisWeek)?.target ?? 0 : 0

    /** Logs an amount into this week; finishing the week gets its moment */
    async function log(amount: string) {
        setError(null)
        setNotice(null)
        const formData = new FormData()
        formData.set("metricId", metricId)
        formData.set("amount", amount)
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
        // Your own entry in the feed, shown the moment it's saved
        const me = competition.competitors.find(c => c.isYou)
        if (me) setActivity(current => [{ ...result.log, participantId: me.participantId, name: me.name, initials: me.initials, isYou: true }, ...current])
        setLogAmount("")
        setNote("")
        if (thisWeek && !wasComplete && weekProgress(metrics, targets, next, thisWeek).complete) {
            setNotice(`Week ${thisWeek} complete.`)
            setPopWeek(thisWeek)
        }
    }

    async function handleDeleteLog(id: string) {
        setError(null)
        const before = { logs, activity }
        setLogs(current => current.filter(l => l.id !== id))
        setActivity(current => current.filter(l => l.id !== id))
        const problem = await failureMessage(deleteLog(id), "remove that log")
        if (problem) {
            setLogs(before.logs)
            setActivity(before.activity)
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
        setTargets(current => [...current.filter(t => !changed.some(c => c.metricId === t.metricId && c.week === t.week)), ...changed])
        setDrafts({})
        setNotice("Targets saved.")
    }

    return (
        <div {...catProps(competition.category)} className="space-y-4">
            <CompetitionHero
                title={competition.title}
                category={competition.category}
                weeks={competition.weeks}
                startDate={competition.startDate}
                endDate={lastDay(competition)}
                position={position}
                season={seasonNow}
                progress={progress}
                metrics={metrics}
                daysLeft={thisWeek ? daysLeft(competition, thisWeek, today) : null}
                standings={ranked}
            />

            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
            {notice && <p role="status" className="text-sm font-semibold text-win-ink">{notice}</p>}

            {progress && thisWeek && (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-start">
                    <section aria-labelledby="this-week" className={card}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 id="this-week" className="text-[15px] font-semibold text-ink">This week&apos;s race</h3>
                            <span className="text-xs text-ink-muted">
                                {formatDateOnly(weekDates(competition, thisWeek).from, "MMM d")} to {formatDateOnly(weekDates(competition, thisWeek).to, "MMM d")}
                            </span>
                        </div>
                        <RaceGrid metrics={metrics} targets={targets} week={thisWeek} standings={ranked} />
                    </section>

                    <div className="space-y-4 min-w-0">
                        <section aria-labelledby="log-heading" className={card}>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h3 id="log-heading" className="text-[15px] font-semibold text-ink">Log progress</h3>
                                <span className="text-xs text-ink-muted">This week only</span>
                            </div>
                            <form
                                onSubmit={e => {
                                    e.preventDefault()
                                    log(logAmount)
                                }}
                                className="space-y-2.5"
                            >
                                <div className="flex gap-2">
                                    <label className="min-w-0 flex-1">
                                        <span className="sr-only">Metric</span>
                                        <select value={metricId} onChange={e => setMetricId(e.target.value)} className={selectClass}>
                                            {metrics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="w-28">
                                        <span className="sr-only">Amount</span>
                                        <Input type="number" min={0} step="any" placeholder="Amount" value={logAmount} onChange={e => setLogAmount(e.target.value)} required />
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {quickAmounts(selectedTarget).map(amount => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => log(String(amount))}
                                            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent-ink"
                                        >
                                            +{amountText(amount, metricOf(metricId)?.unit ?? null)}
                                        </button>
                                    ))}
                                </div>
                                <label className="block">
                                    <span className="sr-only">Note</span>
                                    <Input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} maxLength={200} />
                                    <span className="mt-1 block text-xs text-ink-muted">Visible to everyone in this competition</span>
                                </label>
                                <Button type="submit" className="w-full">Log it</Button>
                            </form>

                        </section>
                        <ActivityFeed entries={activity} metrics={metrics} today={today} thisWeek={thisWeek} onDelete={handleDeleteLog} />
                    </div>
                </div>
            )}

            <section aria-labelledby="season" className={card}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id="season" className="text-[15px] font-semibold text-ink">Season</h3>
                    <span className="text-xs text-ink-muted">
                        {formatDateOnly(competition.startDate, "MMM d, yyyy")} to {formatDateOnly(lastDay(competition), "MMM d, yyyy")}
                    </span>
                </div>
                <SeasonGrid competition={competition} season={seasonNow} popWeek={popWeek} />
            </section>

            <section aria-labelledby="people" className={card}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id="people" className="text-[15px] font-semibold text-ink">People</h3>
                    <span className="text-xs text-ink-muted">{competition.people.length} competing</span>
                </div>
                <PeoplePanel
                    competitionId={competition.id}
                    title={competition.title}
                    people={competition.people}
                    invited={competition.invited}
                    joinCode={competition.joinCode}
                    isOwner={competition.isOwner}
                    friends={friends}
                    finished={position.state === "finished"}
                    origin={origin}
                />
            </section>

            <section aria-labelledby="targets" className={card}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id="targets" className="text-[15px] font-semibold text-ink">Weekly targets</h3>
                    <span className="text-xs text-ink-muted">Weeks that haven&apos;t started can change</span>
                </div>
                <TargetsByMonth
                    competition={competition}
                    metrics={metrics}
                    targets={targets}
                    thisWeek={thisWeek}
                    firstEditable={firstEditable}
                    editable={competition.isOwner}
                    drafts={drafts}
                    onDraft={(key, value) => setDrafts(current => ({ ...current, [key]: value }))}
                />
                {Object.keys(drafts).length > 0 && <Button size="sm" onClick={saveTargets}>Save targets</Button>}
            </section>
        </div>
    )
}
