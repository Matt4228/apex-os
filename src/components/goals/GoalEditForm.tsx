"use client"

import { useState } from "react"
import { updateGoal } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toDateInputValue } from "@/lib/dates"
import TrackingSelect from "./TrackingSelect"
import type { Goal } from "./types"

type EditableGoal = Pick<Goal, "id" | "title" | "description" | "category" | "targetDate" | "targetValue" | "unit" | "tracking">

export default function GoalEditForm({
    goal,
    onSaved,
    onCancel,
}: {
    goal: EditableGoal
    onSaved: (updated: Partial<Goal>) => void
    onCancel: () => void
}) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        setError(null)

        const result = await updateGoal(goal.id, new FormData(e.currentTarget))
        setSaving(false)

        if (result?.error) {
            setError(result.error)
            return
        }
        if (result?.goal) onSaved(result.goal)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="title" defaultValue={goal.title} required autoFocus />
            <Input name="description" placeholder="Description (optional)" defaultValue={goal.description ?? ""} />
            <div className="flex gap-2">
                <Input name="category" placeholder="Category (optional)" defaultValue={goal.category ?? ""}
className="flex-1" />
                <Input name="targetDate" type="date" defaultValue={goal.targetDate ? toDateInputValue(goal.targetDate)
: ""} className="flex-1" />
            </div>
            <div className="flex gap-2">
                <Input
                    name="targetValue"
                    type="number"
                    step="any"
                    placeholder="Target value (optional)"
                    defaultValue={goal.targetValue ?? ""}
                    className="flex-1"
                />
                <Input name="unit" placeholder="Unit e.g. km, lbs" defaultValue={goal.unit ?? ""} className="flex-1"
/>
            </div>
            <TrackingSelect defaultValue={goal.tracking} />
            {error && <p role="alert" className="text-xs text-danger-ink">{error}</p>}
            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}