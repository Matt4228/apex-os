"use client"

import { useState } from "react"
import { EmptyState, type EmptyCopy } from "@/components/ui/empty-state"
import HabitForm from "./HabitForm"

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
        <div className="bg-surface border border-line rounded-lg p-4">
            <HabitForm<Habit>
                onSaved={habit => {
                    onCreated(habit)
                    setOpen(false)
                }}
                onCancel={() => setOpen(false)}
            />
        </div>
    )
}
