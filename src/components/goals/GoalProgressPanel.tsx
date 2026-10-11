"use client"

import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { formatDateOnly } from "@/lib/dates"
import { goalProgress, type Step } from "@/lib/goalProgress"
import GoalProgressChart from "./GoalProgressChart"
import LogEntryForm from "./LogEntryForm"
import type { Entry, Goal } from "./types"

export default function GoalProgressPanel({
    goal,
    steps,
    onEntryLogged,
    onComplete,
}: {
    goal: Pick<Goal, "id" | "title" | "status" | "targetValue" | "unit" | "entries">
    steps: Step[]
    onEntryLogged: (entry: Entry) => void
    onComplete: () => void
}) {
    const progress = goalProgress({ ...goal, tasks: steps })
    const isActive = goal.status === "active"

    if (progress.kind === "steps") {
        return (
            <section aria-label="Progress" className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-ink-soft">{progress.done} of {progress.total} steps</span>
                    <span className="text-ink-muted">{progress.percent}%</span>
                </div>
                <ProgressBar percent={progress.percent} label={`${goal.title} progress`} />

                {progress.nextStep && (
                    <p className="text-sm text-ink-muted mt-3">
                        Next: <span className="text-ink">{progress.nextStep.title}</span>
                        {progress.nextStep.dueDate && ` · due ${formatDateOnly(progress.nextStep.dueDate, "MMM d")}`}
                    </p>
                )}

                {!progress.nextStep && isActive && (
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-ink-soft">All steps done. Mark this goal complete?</p>
                        <Button size="sm" onClick={onComplete}>Mark complete</Button>
                    </div>
                )}
            </section>
        )
    }

    // Without steps, only goals with a target track numbers
    if (!goal.targetValue) return null

    return (
        <section aria-label="Progress" className="mb-8 space-y-4">
            {progress.kind === "numeric" && (
                <div>
                    <div className="flex justify-between text-sm text-ink-muted mb-2">
                        <span>{progress.value} {goal.unit ?? ""}</span>
                        <span>{goal.targetValue} {goal.unit ?? ""}</span>
                    </div>
                    <ProgressBar percent={progress.percent} label={`${goal.title} progress`} />
                </div>
            )}
            {isActive && <LogEntryForm goalId={goal.id} unit={goal.unit} onLogged={onEntryLogged} />}
            {goal.entries.length > 0 && (
                <GoalProgressChart entries={goal.entries} targetValue={goal.targetValue} unit={goal.unit} />
            )}
        </section>
    )
}