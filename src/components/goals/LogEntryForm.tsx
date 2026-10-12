"use client"

import { useState } from "react"
import { logGoalEntry } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackingWords } from "./tracking"
import type { Entry } from "./types"

export default function LogEntryForm({
    goalId,
    unit,
    tracking,
    onLogged,
    onCancel,
}: {
    goalId: string
    unit: string | null
    /** Words the field to match: "Amount to add" for a running total */
    tracking?: string
    onLogged: (entry: Entry) => void
    /** Shows a Cancel button (and Escape) for a form that was opened on demand */
    onCancel?: () => void
}) {
    const [logging, setLogging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { field } = trackingWords(tracking)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        setLogging(true)
        setError(null)

        const result = await logGoalEntry(goalId, new FormData(form))
        setLogging(false)

        if (result?.error) {
            setError(result.error)
            return
        }
        if (result?.entry) onLogged(result.entry)
        form.reset()
    }

    return (
        <div>
            <form
                onSubmit={handleSubmit}
                onKeyDown={e => {
                    if (e.key === "Escape" && onCancel) onCancel()
                }}
                className="flex gap-2"
            >
                <Input
                    name="value"
                    type="number"
                    step="any"
                    placeholder={unit ? `${field} (${unit})` : field}
                    required
                    className="flex-1"
                />
                <Input name="note" placeholder="Note (optional)" className="flex-1" />
                <Button type="submit" size="sm" disabled={logging}>
                    {logging ? "Saving..." : "Save"}
                </Button>
                {onCancel && (
                    <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
            </form>
            {error && <p role="alert" className="text-xs text-danger-ink mt-2">{error}</p>}
        </div>
    )
}