"use client"

import { useEffect, useState } from "react"
import type { Scope } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { formatDateOnly } from "@/lib/dates"

const ALL_SCOPES: Scope[] = ["this", "following", "all"]

/**
 * "This block, this and following, or all blocks?", asked before changing or deleting a day of a repeating block,
 * the way calendar apps ask. `scopes` leaves some out (moving to another day only offers "This block")
 */
export default function ScopeDialog({
    action,
    date,
    scopes = ALL_SCOPES,
    onChoose,
    onCancel,
}: {
    action: "change" | "delete"
    /** The day it was opened from, "YYYY-MM-DD" */
    date: string
    scopes?: Scope[]
    onChoose: (scope: Scope) => void
    onCancel: () => void
}) {
    const [scope, setScope] = useState<Scope>(scopes[0])

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            // Only this dialog closes: the block form underneath stays open
            if (e.key === "Escape") {
                e.stopImmediatePropagation()
                onCancel()
            }
        }
        window.addEventListener("keydown", onKeyDown, true)
        return () => window.removeEventListener("keydown", onKeyDown, true)
    }, [onCancel])

    const choices: Record<Scope, { title: string; detail: string }> = {
        this: { title: "This block", detail: `Only ${formatDateOnly(date, "EEEE, MMM d")}. The other days stay as they are.` },
        following: {
            title: "This and following blocks",
            detail: `From ${formatDateOnly(date, "MMM d")} on. Earlier days keep the old version.`,
        },
        all: { title: "All blocks", detail: "Every day of this block, past and future." },
    }
    const title = action === "delete" ? "Delete repeating block" : "Change repeating block"

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="scope-dialog-title"
                className="w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-xl"
            >
                <h3 id="scope-dialog-title" className="mb-3 text-sm font-semibold text-ink">
                    {title}
                </h3>
                <form
                    onSubmit={e => {
                        e.preventDefault()
                        onChoose(scope)
                    }}
                    className="space-y-4"
                >
                    <fieldset className="space-y-2">
                        <legend className="sr-only">Which days</legend>
                        {scopes.map((choice, i) => (
                            <label
                                key={choice}
                                className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                                    scope === choice ? "border-accent bg-accent/5" : "border-line hover:border-line-strong"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="scope"
                                    value={choice}
                                    checked={scope === choice}
                                    onChange={() => setScope(choice)}
                                    autoFocus={i === 0}
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-ink">{choices[choice].title}</span>
                                    <span className="block text-xs text-ink-muted">{choices[choice].detail}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" variant={action === "delete" ? "danger" : "default"}>
                            {action === "delete" ? "Delete" : "Save"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
