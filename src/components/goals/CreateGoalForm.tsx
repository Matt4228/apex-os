"use client"

import { useState } from "react"
import { createGoal } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Goal = {
    id: string
    title: string
    description: string | null
    category: string | null
    status: string
    targetDate: Date | null
    targetValue: number | null
    unit: string | null
    entries: never[]
}

export default function CreateGoalFormat({ onCreated }: { onCreated: (goal: Goal) => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
            onCreated({ ...result.goal, entries: []})
        }

        setLoading(false)
        setOpen(false)
    }

    if (!open) {
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

            <div className="flex gap-2">
                <Input name="category" placeholder="Category (optional)" className="flex-1" />
                <Input name="unit" placeholder="Unit e.g. km, lbs" className="flex-1" />
            </div>
            
            <div className="flex gap-2">
                <Input name="targetValue" type="number" step="any" placeholder="Target value (optional)" className="flex-1" />
                <Input name="targetDate" type="date" className="flex-1" />
            </div>

            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

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