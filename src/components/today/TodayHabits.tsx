"use client"

import Link from "next/link"
import { useState } from "react"
import { toggleHabitLog } from "@/app/actions/habits"
import { catProps } from "@/lib/categoryColor"
import { parseDateOnly } from "@/lib/dates"
import { failureMessage } from "@/lib/optimistic"
import { usePop } from "@/lib/usePop"

type HabitItem = {
    id: string
    title: string
    targetPerWeek: number
    weekCount: number
    doneToday: boolean
    category?: string | null
    /** Sunday to Saturday of this week, true where logged */
    week?: boolean[]
}

/** Check today on or off: the box, the weekly count and today's square all move together */
const flip = (habit: HabitItem, todayIndex: number): HabitItem => ({
    ...habit,
    doneToday: !habit.doneToday,
    weekCount: habit.weekCount + (habit.doneToday ? -1 : 1),
    week: habit.week?.map((logged, i) => (i === todayIndex ? !habit.doneToday : logged)),
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
    const todayIndex = parseDateOnly(today).getUTCDay()
    const pop = usePop()
    const left = habits.filter(h => !h.doneToday).length

    async function toggle(id: string) {
        if (!habits.find(h => h.id === id)?.doneToday) pop.start(id)
        setError(null)
        setHabits(current => current.map(h => (h.id === id ? flip(h, todayIndex) : h)))

        const problem = await failureMessage(toggleHabitLog(id, today), "update that habit")
        if (problem) {
            // Flipping again restores the checkbox and the weekly count
            setHabits(current => current.map(h => (h.id === id ? flip(h, todayIndex) : h)))
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
                <ul>
                    {habits.map(habit => (
                        // The rail is narrow, so the title gets a line to itself and the week sits under it
                        <li key={habit.id} className="flex items-start">
                            {/* A 44px tap target around the 16px circle, pulled left so the circle lines up with the heading */}
                            <button
                                {...catProps(habit.category)}
                                role="checkbox"
                                aria-checked={habit.doneToday}
                                aria-label={habit.title}
                                onClick={() => toggle(habit.id)}
                                onAnimationEnd={pop.end}
                                className="group -ml-3.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                            >
                                <span
                                    className={`h-4 w-4 rounded-full border-2 transition-colors ${pop.className(habit.id)} ${
                                        habit.category?.trim()
                                            ? habit.doneToday ? "bg-cat-solid border-cat-solid" : "border-cat-solid group-hover:bg-cat-tint"
                                            : habit.doneToday ? "bg-accent border-accent" : "border-line-strong group-hover:border-accent"
                                    }`}
                                />
                            </button>
                            <span className="min-w-0 flex-1 pt-3 pb-1.5">
                                <span className={`block text-sm leading-5 ${habit.doneToday ? "text-ink-muted" : "text-ink-soft"}`}>
                                    {habit.title}
                                </span>
                                <span className="mt-1 flex items-center gap-2">
                                    {/* This week at a glance, Sunday first; the count beside it says the same in words */}
                                    {habit.week && (
                                        <span {...catProps(habit.category)} aria-hidden="true" data-testid="week-squares" className="flex gap-0.5">
                                            {habit.week.map((logged, i) => (
                                                <span key={i} className={`h-2 w-2 rounded-[2px] ${logged ? "bg-cat-solid" : "bg-cat-tint"}`} />
                                            ))}
                                        </span>
                                    )}
                                    <span className="text-xs text-ink-muted tabular-nums">
                                        {habit.weekCount}/{habit.targetPerWeek} this week
                                    </span>
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}