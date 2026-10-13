"use client"

import { useState } from "react"
import { createHabit } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import { CategorySelect, useCategories } from "@/components/ui/category-select"
import { Input } from "@/components/ui/input"
import { EmptyState, type EmptyCopy } from "@/components/ui/empty-state"

type Habit = {
    id: string
    title: string
    category: string | null
    frequency: string
    targetPerWeek: number
    isActive: boolean
    logs: never[]
}

export default function CreateHabitForm({
    onCreated,
    empty,
}: {
    onCreated: (habit: Habit) => void
    /** Set when the list is empty: shows what the page is for in place of the "+ Add" button */
    empty?: EmptyCopy
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [frequency, setFrequency] = useState("daily")
    const { remember } = useCategories()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
         
        const formData = new FormData(e.currentTarget)
        const result = await createHabit(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        if (result?.habit) {
            onCreated(result.habit as Habit)
            remember(result.habit.category)
        }

        setLoading(false)
        setOpen(false)
    }

    if (!open) {
        if (empty) return <EmptyState {...empty} onAction={() => setOpen(true)} />
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full border border-dashed border-line-strong rounded-lg p-3 text-sm text-ink-muted hover:border-ink-muted hover:text-ink-soft transition-colors text-left"
            >
                + Add a habit
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-4 space-y-3">
            <Input name="title" placeholder="Habit title" required autoFocus/>
            <CategorySelect name="category" />

            <div className="flex gap-2">
                <select
                    name = "frequency"
                    value = {frequency}
                    onChange={e => setFrequency(e.target.value)}
                    className="flex h-10 rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                </select>

                <select
                    name="targetPerWeek"
                    className="flex h-10 rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                    {frequency === "daily"
                        ? [7, 6, 5].map(n => (
                            <option key={n} value={n}>{n}x per week</option>
                        ))
                        : [1, 2, 3, 4].map(n => (
                            <option key={n} value={n}>{n}x per week</option>
                        ))
                    }
                </select>
            </div>

            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Adding..." : "Add habit"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}