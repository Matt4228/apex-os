"use client"

import { useState } from "react"
import { createHabit, updateHabit } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import { CategorySelect, useCategories } from "@/components/ui/category-select"
import { Input } from "@/components/ui/input"

export type HabitFields = { id: string; title: string; category: string | null; frequency: string; targetPerWeek: number }

// A daily habit aims for most days of the week; a weekly one for a few
const TARGETS: Record<string, number[]> = { daily: [7, 6, 5], weekly: [1, 2, 3, 4] }

const selectClass =
    "flex h-10 rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"

/** Create a habit, or edit one when `habit` is given. onSaved gets the habit as the server saved it */
export default function HabitForm<T extends HabitFields>({
    habit,
    onSaved,
    onCancel,
}: {
    habit?: HabitFields
    onSaved: (habit: T) => void
    onCancel: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [frequency, setFrequency] = useState(habit?.frequency ?? "daily")
    const [target, setTarget] = useState(habit?.targetPerWeek ?? 7)
    const { remember } = useCategories()

    // Switching daily and weekly offers different targets, so keep the target only if the new list has it
    function changeFrequency(next: string) {
        setFrequency(next)
        if (!TARGETS[next].includes(target)) setTarget(TARGETS[next][0])
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = habit ? await updateHabit(habit.id, formData) : await createHabit(formData)
        setLoading(false)

        if (result?.error) {
            setError(result.error)
            return
        }
        if (result?.habit) {
            remember(result.habit.category)
            onSaved(result.habit as unknown as T)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="title" placeholder="Habit title" aria-label="Habit title" defaultValue={habit?.title} required autoFocus />
            <CategorySelect name="category" defaultValue={habit?.category} />

            <div className="flex gap-2">
                <select
                    name="frequency"
                    aria-label="How often"
                    value={frequency}
                    onChange={e => changeFrequency(e.target.value)}
                    className={selectClass}
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                </select>

                <select
                    name="targetPerWeek"
                    aria-label="Target per week"
                    value={target}
                    onChange={e => setTarget(Number(e.target.value))}
                    className={selectClass}
                >
                    {TARGETS[frequency].map(n => (
                        <option key={n} value={n}>{n}x per week</option>
                    ))}
                </select>
            </div>

            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                    {habit ? (loading ? "Saving..." : "Save") : loading ? "Adding..." : "Add habit"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
