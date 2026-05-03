"use client"

import { useState } from "react"
import { createCompetition } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Competition = {
    id: string
    title: string
    status: string
    startDate: Date
    endDate: Date
    rulesJson: string | null
    entries: never[]
}

export default function createCompetitionForm({
    onCreated,
}: {
    onCreated: (competition: Competition) => void
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await createCompetition(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
            return
        }

        if (result?.competition) {
            onCreated(result.competition as Competition)
        }

        setLoading(false)
        setOpen(false)
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full border border-dashed slate-300 rounded-lg p-3 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors text-left"
            >
                + Add a competition
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white border-slate-200 rounded-lg p-4 space-y-3">
            <Input name="title" placeholder="Competition title e.g. Race to Witch Mountain" required autoFocus />

            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Start date</label>
                    <Input name="startDate" type="date" required />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">End date</label>
                    <Input name="endDate" type="date" required />
                </div>
            </div>

            <textarea 
                name="rulesJson"
                placeholder="Rules (optional) - describe how the competition works"
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 min-h-[80px] resize-none"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Adding..." : "Add Competition"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}