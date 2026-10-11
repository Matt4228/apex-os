"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { updateGoalStatus } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import TaskList from "@/components/tasks/TaskList"
import { formatDateOnly } from "@/lib/dates"
import { succeeded } from "@/lib/optimistic"
import GoalEditForm from "./GoalEditForm"
import GoalProgressPanel from "./GoalProgressPanel"
import type { Entry, Goal } from "./types"

export default function GoalDetail({ initialGoal }: { initialGoal: Goal }) {
    const [goal, setGoal] = useState(initialGoal)
    const [editing, setEditing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isComplete = goal.status === "complete"
    const meta = [goal.category, goal.targetDate && `Due ${formatDateOnly(goal.targetDate, "MMM d, yyyy")}`]
        .filter(Boolean)
        .join(" · ")

    async function setStatus(status: string) {
        const oldStatus = goal.status
        setError(null)
        setGoal(g => ({ ...g, status }))

        if (!(await succeeded(updateGoalStatus(goal.id, status)))) {
            setGoal(g => ({ ...g, status: oldStatus }))
            setError("Couldn't update this goal. Check your connection and try again.")
        }
    }

    function handleEntryLogged(entry: Entry) {
        setGoal(g => ({ ...g, entries: [...g.entries, entry] }))
    }

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <Link
                href="/dashboard/goals"
                className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink-soft transition-colors mb-6"
            >
                <ArrowLeft size={16} aria-hidden="true" />
                Goals
            </Link>

            {editing ? (
                <div className="mb-8">
                    <GoalEditForm
                        goal={goal}
                        onSaved={updated => {
                            setGoal(g => ({ ...g, ...updated }))
                            setEditing(false)
                        }}
                        onCancel={() => setEditing(false)}
                    />
                </div>
            ) : (
                <header className="mb-8">
                    <div className="flex items-start justify-between gap-4">
                        <h2 className={`text-2xl font-semibold text-ink ${isComplete ? "line-through" : ""}`}>
                            {goal.title}
                        </h2>
                        <div className="flex gap-2 flex-shrink-0">
                            {!isComplete && (
                                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                                    Edit
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setStatus(isComplete ? "active" : "complete")}>
                                {isComplete ? "Reopen" : "Complete"}
                            </Button>
                        </div>
                    </div>
                    {meta && <p className="text-sm text-ink-muted mt-1">{meta}</p>}
                    {goal.description && <p className="text-sm text-ink-soft mt-3">{goal.description}</p>}
                </header>
            )}

            {error && <p role="alert" className="text-sm text-danger-ink mb-4">{error}</p>}

            <TaskList
                initialTasks={goal.tasks}
                goalId={goal.id}
                header={steps => (
                    <>
                        <GoalProgressPanel
                            goal={goal}
                            steps={steps}
                            onEntryLogged={handleEntryLogged}
                            onComplete={() => setStatus("complete")}
                        />
                        <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">Steps</h3>
                    </>
                )}
            />
        </main>
    )
}