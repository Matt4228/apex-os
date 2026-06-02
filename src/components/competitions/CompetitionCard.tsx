"use client"

import { useState } from "react"
import { deleteCompetition, updateCompetitionStatus, logCompetitionEntry } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format, differenceInWeeks } from "date-fns"

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
    const completedWeeks = competition.entries.filter(e => e.weekComplete).length
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
        <div className={`bg-white border border-slate-200 rounded-lg p-5 ${!isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <h3 className="text-sm font-medium text-slate-900">{competition.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(competition.startDate), "MMM d")} - {format(new Date(competition.endDate), "MMM d, yyyy")}
                        {isActive && ` · Week ${currentWeek} of ${totalWeeks}`}
                    </p>
                </div>
                <button
                    onClick={() => onDelete(competition.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                >
                    ×
                </button>
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{completedWeeks} weeks complete</span>
                    <span>{totalWeeks} total</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-slate-900 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {competition.entries.length > 0 && (
                <div className="bg-4 space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking wide mb-2">Recent entries</p>
                    {competition.entries.slice(0, 3).map(entry => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Week {entry.weekNumber} - {entry.metric}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">{entry.value}</span>
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
                <form onSubmit={handleLogEntry} className="mt-4 pt-4 border-t border-slate-100 spacec-y-3">
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
                            className="rounded border-slate-300"
                        />
                        <label htmlFor={`complete-${competition.id}`} className="text-sm text-slate-600">
                            Week complete
                        </label>
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <Button type="submit" size="sm" disabled={logging}>
                        {logging ? "Saving..." : "Save entry"}
                    </Button>
                </form>
            )}
        </div>
    )
}