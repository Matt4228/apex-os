"use client"

import { useState } from "react"
import { deleteHabit } from "@/app/actions/habits"
import HabitCard from "./HabitCard"
import CreateHabitForm from "./CreateHabitForm"
import { format } from "date-fns"

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

    function handleCreate(habit: Habit) {
        setHabits(current => [habit, ...current])
    }

    function handleDelete(id: string) {
        setHabits(current => current.filter(h => h.id !== id))
        deleteHabit(id)
    }

    function handleLogToggle(habitId: string, date: string, action: "added" | "removed") {
        setHabits(current =>
            current.map(h => {
                if (h.id !== habitId) return h
                if (action === "removed") {
                    return {
                        ...h,
                        logs: h.logs.filter(
                            l => format(new Date(l.completedOn), "yyyy-MM-dd") !== date
                        ),
                    }
                } else {
                    return {
                        ...h,
                        logs: [
                            ...h.logs,
                            { id: crypto.randomUUID(), completedOn: new Date(date) },
                        ],
                    }
                }
            })
        )
    }

    const active = habits.filter(h => h.isActive)
    const inactive = habits.filter(h => !h.isActive)

    return (
        <div>
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
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
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
        </div>
    )
}