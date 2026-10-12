"use client"

import Link from "next/link"
import { useState } from "react"
import { toggleHabitLog } from "@/app/actions/habits"
import { failureMessage } from "@/lib/optimistic"

type HabitItem = { id: string; title: string; targetPerWeek: number; weekCount: number; doneToday: boolean }

const flip = (habit: HabitItem): HabitItem => ({
    ...habit,
    doneToday: !habit.doneToday,
    weekCount: habit.weekCount + (habit.doneToday ? -1 : 1),
})

export default function TodayHabits({
    habits: initialHabits,
    today,
    className = "",
}: {
    habits: HabitItem[]
    today: string
    className?: string
}) {
    const [habits, setHabits] = useState(initialHabits)
    const [error, setError] = useState<string | null>(null)
    const left = habits.filter(h => !h.doneToday).length

    async function toggle(id: string) {
        setError(null)
        setHabits(current => current.map(h => (h.id === id ? flip(h) : h)))

        const problem = await failureMessage(toggleHabitLog(id, today), "update that habit")
        if (problem) {
            // Flipping again restores the checkbox and the weekly count
            setHabits(current => current.map(h => (h.id === id ? flip(h) : h)))
            setError(problem)
        }
    }

    return (
        <section aria-labelledby="habits-heading" className={className}>
            <div className="flex items-baseline justify-between mb-3">
                <h3 id="habits-heading" className="text-sm font-semibold text-ink">Habits</h3>
                {habits.length > 0 && (
                    <span className="text-xs text-ink-muted">{left === 0 ? "All done" : `${left} left`}</span>
                )}
            </div>

            {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}

            {habits.length === 0 ? (
                <p className="text-sm text-ink-muted">
                    No habits yet.{" "}
                    <Link href="/dashboard/habits" className="text-accent-ink hover:underline">
                        Add one
                    </Link>
                </p>
            ) : (
                <ul className="space-y-0.5">
                    {habits.map(habit => (
                        <li key={habit.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                            <button
                                role="checkbox"
                                aria-checked={habit.doneToday}
                                aria-label={habit.title}
                                onClick={() => toggle(habit.id)}
                                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                                    habit.doneToday ? "bg-accent border-accent" : "border-line-strong hover:border-accent"
                                }`}
                            />
                            <span className={`flex-1 min-w-0 text-sm ${habit.doneToday ? "text-ink-muted" : "text-ink-soft"}`}>
                                {habit.title}
                            </span>
                            <span className="text-xs text-ink-muted tabular-nums flex-shrink-0">
                                {habit.weekCount}/{habit.targetPerWeek} this week
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}