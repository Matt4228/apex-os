"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Target } from "lucide-react"
import { updateTask } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateOnly, parseDateOnly, toDateInputValue } from "@/lib/dates"
import GoalSelect from "./GoalSelect"
import type { GoalOption, Task } from "./types"

const priorityStyles = {
    high: "bg-danger-tint text-danger-ink",
    medium: "bg-warning-tint text-warning-ink",
    low: "bg-success-tint text-success-ink",
}

export default function TaskCard({
    task,
    goals,
    onToggle,
    onDelete,
    onUpdate,
    isPending,
    highlighted = false,
}: {
    task: Task
    /** Goals to offer in the edit form; leave out to hide the goal picker */
    goals?: GoalOption[]
    onToggle: (id: string, status: string) => void
    onDelete: (id: string) => void
    onUpdate: (id: string, updated: Partial<Task>) => void
    isPending: boolean
    /** Just added or edited: outline the card and scroll it into view */
    highlighted?: boolean
}) {
    const [editing, setEditing] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!highlighted) return
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        cardRef.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" })
    }, [highlighted])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isDone = task.status === "done"

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const result = await updateTask(task.id, formData)
        setLoading(false)

        if (result?.error) {
            setError(result.error)
            return
        }

        const updated: Partial<Task> = {
            title: String(formData.get("title")),
            priority: String(formData.get("priority")),
            dueDate: formData.get("dueDate") ? parseDateOnly(String(formData.get("dueDate"))) : null,
        }
        if (goals) {
            const goalId = String(formData.get("goalId") ?? "")
            updated.goalId = goalId || null
            // The current goal can be missing from `goals` when it is no longer active
            updated.goal = goalId ? (goals.find(g => g.id === goalId) ?? task.goal ?? null) : null
        }
        onUpdate(task.id, updated)
        setEditing(false)
    }   

    if (editing) {
        return (
            <form onSubmit={handleEdit} className="bg-surface border border-accent rounded-lg p-4 space-y-3">
                <Input name="title" defaultValue={task.title} required autoFocus />
                <div className="flex gap-2">
                    <select
                        name="priority"
                        defaultValue={task.priority}
                        className="flex h-10 rounded-md border border-line bg-surface px-3 py-2 text-sm
focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                    </select>
                    <Input
                        name="dueDate"
                        type="date"
                        defaultValue={task.dueDate ? toDateInputValue(task.dueDate) : ""}
                        className="flex-1"
                    />
                </div>
                {goals && <GoalSelect goals={goals} current={task.goal} />}
                {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
                <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                        Cancel
                    </Button>
                </div>
            </form>
        )
    }

    return (
        <div
            ref={cardRef}
            data-highlighted={highlighted || undefined}
            className={`bg-surface border rounded-lg p-4 flex items-start gap-3 transition-[opacity,border-color,box-shadow] duration-500 ${
                highlighted ? "border-accent ring-2 ring-accent/30" : "border-line"
            } ${isDone ? "opacity-60" : ""}`}
        >
            <button
                role="checkbox"
                aria-checked={isDone}
                aria-label={task.title}
                onClick={() => onToggle(task.id, isDone ? "todo" : "done")}
                disabled={isPending}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    isDone
                        ? "bg-accent border-accent"
                        : "border-line-strong hover:border-accent"
                    }`}
            />

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-ink transition-all ${isDone ? "line-through" : ""}`}>
                    {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[task.priority as keyof typeof priorityStyles]}`}>
                        {task.priority}
                    </span>
                    {task.dueDate && (
                        <span className="text-xs text-ink-muted">
                            Due {formatDateOnly(task.dueDate, "MMM d")}
                        </span>
                    )}
                    {task.goal && (
                        <Link
                            href={`/dashboard/goals/${task.goal.id}`}
                            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-soft transition-colors"
                        >
                            <Target size={12} aria-hidden="true" />
                            {task.goal.title}
                        </Link>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
                {!isDone && (
                    <button
                        onClick={() => setEditing(true)}
                        className="text-xs text-ink-muted hover:text-accent-ink transition-colors leading-none"
                    >
                        Edit
                    </button>
                )}
                <button
                    onClick={() => onDelete(task.id)}
                    disabled={isPending}
                    className="text-ink-muted hover:text-danger-ink transition-colors text-lg leading-none"
                    aria-label={`Delete ${task.title}`}
                >
                    ×
                </button>
            </div>
        </div>
    )
}