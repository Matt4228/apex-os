"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Target } from "lucide-react"
import { updateTask } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateOnly, parseDateOnly, toDateInputValue } from "@/lib/dates"
import { isOverdue } from "@/lib/today"
import { usePop } from "@/lib/usePop"
import GoalSelect from "./GoalSelect"
import type { GoalOption, Task } from "./types"

// About 44px to tap, the size touch guidelines ask for. Negative margins keep the card's layout as it was
const cardAction = "-my-3 h-11 min-w-11 px-2 flex items-center justify-center rounded-md text-ink-muted transition-colors"

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
    highlighted = false,
    today,
}: {
    task: Task
    /** Goals to offer in the edit form; leave out to hide the goal picker */
    goals?: GoalOption[]
    onToggle: (id: string, status: string) => void
    onDelete: (id: string) => void
    onUpdate: (id: string, updated: Partial<Task>) => void
    /** Just added or edited: outline the card and scroll it into view */
    highlighted?: boolean
    /** The user's calendar day, "YYYY-MM-DD", from the server, so an open task past its due date shows in red */
    today: string
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
    const pop = usePop()

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
            {/* The circle stays 20px; the button around it is 44px, so a near miss still counts */}
            <button
                role="checkbox"
                aria-checked={isDone}
                aria-label={task.title}
                onClick={() => {
                    if (!isDone) pop.start()
                    onToggle(task.id, isDone ? "todo" : "done")
                }}
                onAnimationEnd={pop.end}
                className="group -ml-3 -mr-3 -mb-3 -mt-2.5 p-3 flex-shrink-0 rounded-full"
            >
                <span
                    aria-hidden="true"
                    className={`block w-5 h-5 rounded-full border-2 transition-colors ${pop.className()} ${
                        isDone
                            ? "bg-accent border-accent"
                            : "border-line-strong group-hover:border-accent"
                    }`}
                />
            </button>

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-ink transition-all ${isDone ? "line-through" : ""}`}>
                    {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[task.priority as keyof typeof priorityStyles]}`}>
                        {task.priority}
                    </span>
                    {task.dueDate && (
                        <span className={`text-xs ${!isDone && isOverdue(task.dueDate, today) ? "text-danger-ink font-medium" : "text-ink-muted"}`}>
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

            {/* A gap between Edit and Delete, so reaching for one doesn't hit the other */}
            <div className="-mr-2 flex items-center gap-1 flex-shrink-0">
                {!isDone && (
                    <button
                        onClick={() => setEditing(true)}
                        className={`${cardAction} text-xs hover:text-accent-ink hover:bg-sunken`}
                    >
                        Edit
                    </button>
                )}
                <button
                    onClick={() => onDelete(task.id)}
                    className={`${cardAction} text-lg leading-none hover:text-danger-ink hover:bg-sunken`}
                    aria-label={`Delete ${task.title}`}
                >
                    ×
                </button>
            </div>
        </div>
    )
}