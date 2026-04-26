"use client"

import { useState } from "react"
import { createHabit } from "@/app/actions/habits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
}: {
    onCreated: (habit: Habit) => void
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [frequency, setFrequency] = useState("daily")

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
        }

        setLoading(false)
        setOpen(false)
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full border border-dashed border-slate-300 rounded-lg p-3 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors text-left"
            >
                + Add a habit
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <Input name="title" placeholder="Habit title" required autoFocus/>
            <Input name="category" placeholder="Category (optional)" />

            <div className="flex gap-2">
                <select
                    name = "frequency"
                    value = {frequency}
                    onChange={e => setFrequency(e.target.value)}
                    className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                </select>

                <select
                    name="targetPerWeek"
                    className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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

            {error && <p className="text-sm text-red-500">{error}</p>}

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