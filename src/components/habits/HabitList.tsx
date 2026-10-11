"use client"

import { useState } from "react"
import { deleteHabit } from "@/app/actions/habits"
import HabitCard from "./HabitCard"
import CreateHabitForm from "./CreateHabitForm"
import { parseDateOnly, toDateInputValue } from "@/lib/dates"
import { succeeded } from "@/lib/optimistic"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { UndoToast } from "@/components/ui/undo-toast"

type HabitLog = {
    id: string
    completedOn: Date
}

type Habit ={
    id: string
    title: string
    category: string | null
    frequency: string
    targetPerWeek: number
    isActive: boolean
    logs: HabitLog[]
}

export default function HabitList({ initialHabits }: { initialHabits: Habit[] }) {
    const [habits, setHabits] = useState<Habit[]>(initialHabits)
    const [error, setError] = useState<string | null>(null)
    const { pending, undo, requestDelete, isHidden } = useUndoableDelete(deleteHabit, setError)

    function handleCreate(habit: Habit) {
        setHabits(current => [habit, ...current])
    }

    function handleDelete(id: string) {
      const habit = habits.find(h => h.id === id)
      if (!habit) return
      setError(null)
      requestDelete(id, habit.title)
    }

    function handleLogToggle(habitId: string, date: string, action: "added" | "removed") {
        setHabits(current =>
            current.map(h => {
                if (h.id !== habitId) return h
                if (action === "removed") {
                    return {
                        ...h,
                        logs: h.logs.filter(l => toDateInputValue(l.completedOn) !== date),
                    }
                } else {
                    return {
                        ...h,
                        logs: [
                            ...h.logs,
                            { 
                                id: crypto.randomUUID(),
                                completedOn: parseDateOnly(date), 
                            },
                        ],
                    }
                }
            })
        )
    }

    const visibleHabits = habits.filter(h => !isHidden(h.id))
    const active = visibleHabits.filter(h => h.isActive)
    const inactive = visibleHabits.filter(h => !h.isActive)

    return (
        <div>
            {error && <p role="alert" className="text-sm text-danger mb-3">{error}</p>}
            <div className="space-y-3 mb-6">
                {active.map(habit => (
                    <HabitCard
                        key={habit.id}
                        habit={habit}
                        onDelete={handleDelete}
                        onLogToggle={handleLogToggle}
                    />
                ))}
                <CreateHabitForm onCreated={handleCreate} />
            </div>

            {inactive.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
                        Inactive
                    </p>
                    <div className="space-y-3">
                        {inactive.map(habit => (
                            <HabitCard
                                key={habit.id}
                                habit={habit}
                                onDelete={handleDelete}
                                onLogToggle={handleLogToggle}
                            />
                        ))}
                    </div>
                </div>
            )}
            {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
        </div>
    )
}