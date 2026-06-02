"use client"

import { useState } from "react"
import { deleteGoal, updateGoalStatus, logGoalEntry, updateGoal } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import GoalProgressChart from "./GoalProgressChart"

type Entry = {
    id: string
    value: number
    note: string | null
    loggedOn: Date
}

type Goal = {
    id: string
    title: string
    description: string | null
    category: string | null
    status: string
    targetDate: Date | null
    targetValue: number | null
    unit: string | null
    entries: Entry[]
}

export default function GoalCard({
    goal,
    onDelete,
    onStatusChange,
    onEntryLogged,
    onUpdate,
}: {
    goal: Goal
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
    onEntryLogged: (goalId: string, entry: Entry) => void
    onUpdate: (id: string, update: Partial<Goal>) => void
}) {
    const [showLog, setShowLog] = useState(false)
    const [editing, setEditing] = useState(false)
    const [logging, setLogging] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const latestEntry = goal.entries[0]
    const progress = goal.targetValue && latestEntry
        ? Math.min((latestEntry.value / goal.targetValue)  * 100, 100)
        : null

    const isComplete = goal.status === "complete"

    async function handleLogEntry(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLogging(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await logGoalEntry(goal.id, formData)

        if (result?.error) {
            setError(result.error)
            setLogging(false)
            return
        }

        if (result?.entry) {
            onEntryLogged(goal.id, result.entry)
        }
        
        setLogging(false)
        setShowLog(false)
        ;(e.target as HTMLFormElement).reset()
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await updateGoal(goal.id, formData)

        if (result?.error) {
            setError(result.error)
            setSaving(false)
            return
        }
        
        if (result?.goal) {
            onUpdate(goal.id, result.goal)
        }

        setSaving(false)
        setEditing(false)
    }

    if (editing) {
        return (
            <form onSubmit={handleEdit} className="bg-white border border-accent rounded-lg p-5 space-y-3">
                <Input name="title" defaultValue={goal.title} required autoFocus />
                <Input name="description" placeholder="Description (optional)" defaultValue={goal.description ?? ""} className="flex-1" />
                <div className="flex gap-2">
                    <Input name="category" placeholder="Category (optional)" defaultValue={goal.category ?? ""} className="flex-1" />
                    <Input name="targetDate" type="date" defaultValue={goal.targetDate ? format(new Date(goal.targetDate), "yyyy-MM-dd") : ""} className="flex-1" />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                        Cancel
                    </Button>
                </div>
            </form>
        )
    }

    return (
        <div className={`bg-white border border-slate-200 rounded-lg p-5 ${isComplete ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-medium text-slate-900 ${isComplete ? "line-through" : ""}`}>
                            {goal.title}
                        </h3>
                        {goal.category && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                {goal.category}
                            </span>
                        )}
                    </div>
                    {goal.description && (
                        <p className="text-xs text-slate-400 mt-1">{goal.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {!isComplete && (
                        <button 
                            onClick={() => setEditing(true)}
                            className="text-xs text-slate-400 hover:text-accent transition-colors leading-none"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(goal.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                    >
                        ×
                    </button>
                </div>
                
            </div>

            {progress !== null && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>
                            {latestEntry.value} {goal.unit ?? ""}
                        </span>
                        <span>
                            {goal.targetValue} {goal.unit ?? ""}
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${progress}` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                    {goal.targetDate && (
                        <span>Due {format(new Date(goal.targetDate), "MMM d, yyyy")}</span>
                    )}
                    {latestEntry && (
                        <span>Last Logged {format(new Date(latestEntry.loggedOn), "MMM d")}</span>
                    )}
                </div>
                <div className="flex gap-2">
                    {!isComplete && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowLog(v => !v)}
                        >
                            Log progress
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onStatusChange(goal.id, isComplete ? "active" : "complete")}
                    >
                        {isComplete ? "Reopen" : "Complete"}
                    </Button>
                </div>
            </div>

            {showLog && (
                <form onSubmit={handleLogEntry} className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <Input
                        name="value"
                        type="number"
                        step="any"
                        placeholder={goal.unit ? `Value (${goal.unit})` : "Value"}
                        required
                        className="flex-1"
                        autoFocus
                    />
                    <Input
                        name="note"
                        placeholder="Note (optional)"
                        className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={logging}>
                        {logging ? "Saving..." : "Save"}
                    </Button>
                </form>
            )}
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

            {goal.entries.length > 0 && (
                <GoalProgressChart 
                    entries={goal.entries}
                    targetValue={goal.targetValue}
                    unit={goal.unit}
                />
            )}
        </div>
    )
}