"use client"

import { useState } from "react"
import { deleteGoal, updateGoalStatus } from "@/app/actions/goals"
import GoalCard from "./GoalCard"
import CreateGoalForm from "./CreateGoalForm"
import { restoreAt, succeeded } from "@/lib/optimistic"

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

    function handleCreate(goal: Goal) {
        setGoals(current => [goal, ...current])
    }
   
    async function handleDelete(id: string) {
        const index = goals.findIndex(g => g.id === id)
        const goal = goals[index]
        if (!goal) return
        setError(null)
        setGoals(current => current.filter(g => g.id !== id))

        if (!(await succeeded(deleteGoal(id)))) {
            setGoals(current => restoreAt(current, goal, index))
            setError(`Couldn't delete "${goal.title}". Check your connection and try again.`)
        }
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

    const active = goals.filter(g => g.status === "active")
    const complete = goals.filter(g => g.status === "complete")

    return (
        <div>
            {error && <p role="alert" className="text-sm text-danger mb-3">{error}</p>}
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
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
        </div>
    )
}