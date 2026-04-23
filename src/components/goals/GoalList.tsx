"use client"

import { useState } from "react"
import { deleteGoal, updateGoalStatus } from "@/app/actions/goals"
import GoalCard from "./GoalCard"
import CreateGoalForm from "./CreateGoalForm"
import { StringToBoolean } from "class-variance-authority/types"
import { handleClientScriptLoad } from "next/script"

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

    function handleCreate(goal: Goal) {
        setGoals(current => [goal, ...current])
    }
   
    function handleDelete(id: string) {
        setGoals(current => current.filter(g => g.id !== id))
        deleteGoal(id)
    }

    function handleStatusChange(id: string, status: string) {
        setGoals(current =>
            current.map(g => g.id === id ? { ...g, status } : g)
        )
        updateGoalStatus(id, status)
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
            <div className="space-y-3 mb-6">
                {active.map(goal => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onEntryLogged={handleEntryLogged}
                    />
                ))}
                <CreateGoalForm onCreated={handleCreate} />
            </div>

            {complete.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                        Completed
                    </p>
                    <div className="space-y-3">
                        {complete.map(goal => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onDelete={handleDelete}
                                onStatusChange={handleStatusChange}
                                onEntryLogged={handleEntryLogged}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}