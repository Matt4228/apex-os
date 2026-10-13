"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LocalDate } from "@/components/ui/local-date"
import { ProgressBar } from "@/components/ui/progress-bar"
import { ProgressRing } from "@/components/ui/progress-ring"
import { catProps } from "@/lib/categoryColor"
import { formatDateOnly } from "@/lib/dates"
import { goalProgress } from "@/lib/goalProgress"
import GoalEditForm from "./GoalEditForm"
import LogEntryForm from "./LogEntryForm"
import { trackingWords, withUnit } from "./tracking"
import type { Entry, Goal } from "./types"

export default function GoalCard({
    goal,
    onDelete,
    onStatusChange,
    onEntryLogged,
    onUpdate,
}: {
    goal: Goal
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
    onEntryLogged: (goalId: string, entry: Entry) => void
    onUpdate: (id: string, update: Partial<Goal>) => void
}) {
    const [showLog, setShowLog] = useState(false)
    const [editing, setEditing] = useState(false)

    const progress = goalProgress(goal)
    const words = trackingWords(goal.tracking)
    const isComplete = goal.status === "complete"

    if (editing) {
        return (
            <div className="bg-surface border border-accent rounded-lg p-5">
                <GoalEditForm
                    goal={goal}
                    onSaved={updated => {
                        onUpdate(goal.id, updated)
                        setEditing(false)
                    }}
                    onCancel={() => setEditing(false)}
                />
            </div>
        )
    }

    return (
        // The goal's category colors its chip, bar or ring
        <div {...catProps(goal.category)} className={`bg-surface border border-line rounded-lg p-5 ${isComplete ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-medium text-ink ${isComplete ? "line-through" : ""}`}>
                            <Link href={`/dashboard/goals/${goal.id}`} className="hover:text-accent-ink
transition-colors">
                                {goal.title}
                            </Link>
                        </h3>
                        {goal.category && (
                            <span className="text-xs font-medium bg-cat-tint text-cat-ink px-2 py-0.5 rounded-full">
                                {goal.category}
                            </span>
                        )}
                    </div>
                    {goal.description && (
                        <p className="text-xs text-ink-muted mt-1">{goal.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {!isComplete && (
                        <button
                            onClick={() => setEditing(true)}
                            className="text-xs text-ink-muted hover:text-accent-ink transition-colors leading-none"
                        >
                            Edit
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(goal.id)}
                        className="text-ink-muted hover:text-danger-ink transition-colors text-lg leading-none
flex-shrink-0"
                        aria-label={`Delete ${goal.title}`}
                    >
                        ×
                    </button>
                </div>
            </div>

            {progress.kind === "steps" && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-ink-muted mb-1">
                        <span>{progress.done} of {progress.total} steps</span>
                        <span>{progress.percent}%</span>
                    </div>
                    <ProgressBar percent={progress.percent} label={`${goal.title} progress`} tone="category" />
                </div>
            )}

            {/* Numbers get a ring, steps a bar, so the two kinds of goal look different at a glance */}
            {progress.kind === "numeric" && (
                <div className="mb-3 flex items-center gap-4">
                    <ProgressRing percent={progress.percent} label={`${goal.title} progress`} />
                    <div className="text-xs text-ink-muted space-y-0.5">
                        <p className="text-sm text-ink">{words.value(withUnit(progress.value, goal.unit))}</p>
                        <p>Target {withUnit(goal.targetValue, goal.unit)}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 text-xs text-ink-muted">
                    {goal.targetDate && (
                        <span>Due {formatDateOnly(goal.targetDate, "MMM d, yyyy")}</span>
                    )}
                    {progress.kind === "numeric" && (
                        <span>Last logged <LocalDate date={progress.loggedOn} pattern="MMM d" /></span>
                    )}
                </div>
                <div className="flex gap-2">
                    {/* Steps measure progress once a goal has any, so logging numbers would do nothing */}
                    {!isComplete && progress.kind !== "steps" && (
                        <Button size="sm" variant="outline" onClick={() => setShowLog(v => !v)}>
                            {words.log}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onStatusChange(goal.id, isComplete ? "active" : "complete")}
                    >
                        {isComplete ? "Reopen" : "Complete"}
                    </Button>
                </div>
            </div>

            {showLog && (
                <div className="mt-4 pt-4 border-t border-line">
                    <LogEntryForm
                        goalId={goal.id}
                        unit={goal.unit}
                        tracking={goal.tracking}
                        onLogged={entry => {
                            onEntryLogged(goal.id, entry)
                            setShowLog(false)
                        }}
                        onCancel={() => setShowLog(false)}
                    />
                </div>
            )}
        </div>
    )
}