"use client"

import { useState } from "react"
import { createGoal } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import { CategorySelect, useCategories } from "@/components/ui/category-select"
import { Input } from "@/components/ui/input"
import { EmptyState, type EmptyCopy } from "@/components/ui/empty-state"
import TrackingSelect from "./TrackingSelect"
import type { Goal }  from "./types"

export default function CreateGoalFormat({
    onCreated,
    empty,
}: {
    onCreated: (goal: Goal) => void
    /** Set when the list is empty: shows what the page is for in place of the "+ Add" button */
    empty?: EmptyCopy
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { remember } = useCategories()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await createGoal(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        if (result?.goal) {
            onCreated({ ...result.goal, entries: [], tasks: []})
            remember(result.goal.category)
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
                + Add a goal
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-4 space-y-3">
            <Input name="title" placeholder="Goal title" required autoFocus />
            <Input name="description" placeholder="Description (optional)" />

            <CategorySelect name="category" />

            <div className="flex gap-2">
                <Input name="targetValue" type="number" step="any" placeholder="Target value (optional)" className="flex-1" />
                <Input name="unit" placeholder="Unit e.g. km, lbs" className="flex-1" />
            </div>

            <Input name="targetDate" type="date" aria-label="Target date" />

            <TrackingSelect />

            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Adding..." : "Add goal"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}