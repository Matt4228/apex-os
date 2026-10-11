"use client"

import { useState } from "react"
import { deleteGoal, updateGoalStatus } from "@/app/actions/goals"
import GoalCard from "./GoalCard"
import CreateGoalForm from "./CreateGoalForm"
import { succeeded } from "@/lib/optimistic"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { UndoToast } from "@/components/ui/undo-toast"

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

export default function GoalList({ initialGoals }: {initialGoals: Goal[] }) {
    const [goals, setGoals] = useState<Goal[]>(initialGoals)
    const [error, setError] = useState<string | null>(null)
    const { pending, undo, requestDelete, isHidden } = useUndoableDelete(deleteGoal, setError)

    function handleCreate(goal: Goal) {
        setGoals(current => [goal, ...current])
    }
   
    function handleDelete(id: string) {
      const goal = goals.find(g => g.id === id)
      if (!goal) return
      setError(null)
      requestDelete(id, goal.title)
    }

    async function handleStatusChange(id: string, status: string) {
        const oldStatus = goals.find(g => g.id === id)?.status
        if (!oldStatus) return
        setError(null)
        setGoals(current => current.map(g => g.id === id ? { ...g, status } : g))

        if (!(await succeeded(updateGoalStatus(id, status)))) {
            setGoals(current => current.map(g => g.id === id ? { ...g, status: oldStatus } : g))
            setError("Couldn't update that goal. Check your connection and try again.")
        }
    }

    function handleUpdate(id: string, updated: Partial<Goal>) {
        setGoals(current => 
            current.map(g => g.id === id ? { ...g, ...updated } : g)
        )
    }

    function handleEntryLogged(goalId: string, entry: Entry) {
        setGoals(current =>
            current.map(g =>
                g.id === goalId
                    ? { ...g, entries: [entry, ...g.entries] }
                    : g
            )
        )
    }

    const visibleGoals = goals.filter(g => !isHidden(g.id))
    const active = visibleGoals.filter(g => g.status === "active")
    const complete = visibleGoals.filter(g => g.status === "complete")

    return (
        <div>
            {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}
            <div className="space-y-3 mb-6">
                {active.map(goal => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onUpdate={handleUpdate}
                        onEntryLogged={handleEntryLogged}
                    />
                ))}
                <CreateGoalForm onCreated={handleCreate} />
            </div>

            {complete.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
                        Completed
                    </p>
                    <div className="space-y-3">
                        {complete.map(goal => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onDelete={handleDelete}
                                onStatusChange={handleStatusChange}
                                onUpdate={handleUpdate}
                                onEntryLogged={handleEntryLogged}
                            />
                        ))}
                    </div>
                </div>
            )}
            {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
        </div>
    )
}