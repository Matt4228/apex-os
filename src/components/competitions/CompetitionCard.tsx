"use client"

import { useState } from "react"
import { deleteCompetition, updateCompetitionStatus, logCompetitionEntry } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { differenceInWeeks } from "date-fns"
import { formatDateOnly } from "@/lib/dates"
import { countCompletedWeeks } from "@/lib/dashboardStats"

type Entry = {
    id: string
    weekNumber: number
    value: number
    metric: string
    weekComplete: boolean
}

type Competition =  {
    id: string
    title: string
    status: string
    startDate: Date
    endDate: Date
    rulesJson: string | null
    entries: Entry[]
}

export default function CompetitionCard({
    competition,
    onDelete,
    onStatusChange,
    onEntryLogged,
}: {
    competition: Competition
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
    onEntryLogged: (competitionId: string, entry: Entry) => void
}) {
    const [showLog, setShowLog] = useState(false)
    const [logging, setLogging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [weekComplete, setWeekComplete] = useState(false)

    const isActive = competition.status === "active"
    const currentWeek = differenceInWeeks(new Date(), new Date(competition.startDate)) + 1
    const totalWeeks = differenceInWeeks(new Date(competition.endDate), new Date(competition.startDate))
    const completedWeeks = countCompletedWeeks(competition.entries)
    const progress = totalWeeks > 0 ? Math.min((completedWeeks / totalWeeks) * 100, 100) : 0

    async function handleLogEntry(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLogging(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        formData.set("weekComplete", String(weekComplete))
        formData.set("weekNumber", String(currentWeek))

        const result = await logCompetitionEntry(competition.id, formData)

        if (result?.error) {
            setError(result.error)
            setLogging(false)
            return
        }

        if (result?.entry) {
            onEntryLogged(competition.id, result.entry)
        }

        setLogging(false)
        setShowLog(false)
        ;(e.target as HTMLFormElement).reset()
        setWeekComplete(false)
    }

    return (
        <div className={`bg-surface border border-line rounded-lg p-5 ${!isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-sm font-medium text-ink">{competition.title}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                        {formatDateOnly(competition.startDate, "MMM d")} - {formatDateOnly(competition.endDate, "MMM d, yyyy")}
                        {isActive && ` · Week ${currentWeek} of ${totalWeeks}`}
                    </p>
                </div>
                <button
                    onClick={() => onDelete(competition.id)}
                    className="text-ink-muted hover:text-danger-ink transition-colors text-lg leading-none flex-shrink-0"
                    aria-label={`Delete ${competition.title}`}
                >
                    ×
                </button>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs text-ink-muted mb-1">
                    <span>{completedWeeks} weeks complete</span>
                    <span>{totalWeeks} total</span>
                </div>
                <div className="h-1.5 bg-sunken rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-ink rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {competition.entries.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Recent entries</p>
                    {competition.entries.slice(0, 3).map(entry => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                            <span className="text-ink-muted">Week {entry.weekNumber} - {entry.metric}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-ink">{entry.value}</span>
                                {entry.weekComplete && (
                                    <span className="text-green-600 font-medium">✓</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                {isActive && (
                    <Button size="sm" variant="outline" onClick={() => setShowLog(v => !v)}>
                        Log week {currentWeek}
                    </Button>
                )}
                <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => onStatusChange(competition.id, isActive ? "complete" : "active")}
                >
                    {isActive ? "Complete" : "Reopen"}
                </Button>
            </div>

            {showLog && (
                <form onSubmit={handleLogEntry} className="mt-4 pt-4 border-t border-line space-y-3">
                    <div className="flex gap-2">
                        <Input 
                            name="metric"
                            placeholder="Metric (e.g. miles, lbs)"
                            required
                            className="flex-1"
                            autoFocus
                        />
                        <Input 
                            name="value"
                            type="number"
                            step="any"
                            placeholder="Value"
                            required
                            className="flex-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox"
                            id={`complete-${competition.id}`}
                            checked={weekComplete}
                            onChange={e => setWeekComplete(e.target.checked)}
                            className="rounded border-line-strong"
                        />
                        <label htmlFor={`complete-${competition.id}`} className="text-sm text-ink-soft">
                            Week complete
                        </label>
                    </div>
                    {error && <p role="alert" className="text-xs text-danger-ink">{error}</p>}
                    <Button type="submit" size="sm" disabled={logging}>
                        {logging ? "Saving..." : "Save entry"}
                    </Button>
                </form>
            )}
        </div>
    )
}