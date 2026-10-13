"use client"

import { useState } from "react"
import { deleteHabit, toggleHabitActive } from "@/app/actions/habits"
import HabitCard from "./HabitCard"
import CreateHabitForm from "./CreateHabitForm"
import type { HabitFields } from "./HabitForm"
import { parseDateOnly, toDateInputValue } from "@/lib/dates"
import { failureMessage } from "@/lib/optimistic"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { UndoToast } from "@/components/ui/undo-toast"
import type { EmptyCopy } from "@/components/ui/empty-state"
import { Repeat } from "lucide-react"

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

const NO_HABITS: EmptyCopy = {
    icon: Repeat,
    title: "No habits yet",
    description: "Habits are things you want to do regularly, like exercise or reading. Check them off each day to see your week fill in.",
    action: "Create your first habit",
}

export default function HabitList({ initialHabits, today }: { initialHabits: Habit[]; today: string }) {
    const [habits, setHabits] = useState<Habit[]>(initialHabits)
    const [error, setError] = useState<string | null>(null)
    const { pending, undo, requestDelete, isHidden } = useUndoableDelete("habit", deleteHabit, setError)

    function handleCreate(habit: Habit) {
        setHabits(current => [habit, ...current])
    }

    function handleUpdate(id: string, saved: HabitFields) {
        const { title, category, frequency, targetPerWeek } = saved
        setHabits(current => current.map(h => (h.id === id ? { ...h, title, category, frequency, targetPerWeek } : h)))
    }

    /** Pause or resume on screen now; flip it back and explain if the server says no */
    async function handlePauseToggle(id: string) {
        const habit = habits.find(h => h.id === id)
        if (!habit) return
        const flip = () => setHabits(current => current.map(h => (h.id === id ? { ...h, isActive: !h.isActive } : h)))
        setError(null)
        flip()

        const problem = await failureMessage(toggleHabitActive(id, !habit.isActive), habit.isActive ? "pause that habit" : "resume that habit")
        if (problem) {
            flip()
            setError(problem)
        }
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
            {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}
            <div className="space-y-3 mb-6">
                {active.map(habit => (
                    <HabitCard
                        key={habit.id}
                        habit={habit}
                        onDelete={handleDelete}
                        onLogToggle={handleLogToggle}
                        onUpdate={handleUpdate}
                        onPauseToggle={handlePauseToggle}
                        today={today}
                    />
                ))}
                <CreateHabitForm onCreated={handleCreate} empty={visibleHabits.length === 0 ? NO_HABITS : undefined} />
            </div>

            {inactive.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
                        Paused
                    </p>
                    <div className="space-y-3">
                        {inactive.map(habit => (
                            <HabitCard
                                key={habit.id}
                                habit={habit}
                                onDelete={handleDelete}
                                onLogToggle={handleLogToggle}
                                onUpdate={handleUpdate}
                                onPauseToggle={handlePauseToggle}
                                today={today}
                            />
                        ))}
                    </div>
                </div>
            )}
            {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
        </div>
    )
}