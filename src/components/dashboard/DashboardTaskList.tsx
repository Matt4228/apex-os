"use client"

import { useState } from "react"
import { updateTaskStatus } from "@/app/actions/tasks"
import { restoreAt, succeeded } from "@/lib/optimistic"

type Task = {
    id: string
    title: string
    status: string
    priority: string
    dueDate: Date | null
    completedAt: Date | null
}

const priorityStyles = {
    high: "bg-danger/10 text-danger",
    medium: "bg-warning/10 text-warning",
    low: "bg-success/10 text-success-dark",
}

export default function DashboardTaskList({ initialTasks }: { initialTasks: Task[] }) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [error, setError] = useState<string | null>(null)

    async function handleToggle(id: string) {
        const task = tasks.find(t => t.id === id)
        if (!task) return
        const oldStatus = task.status
        const newStatus = oldStatus === "done" ? "todo" : "done"
        setError(null)
        setTasks(current => current.map(t => t.id === id ? { ...t, status: newStatus } : t))

        if (!(await succeeded(updateTaskStatus(id, newStatus)))) {
            setTasks(current => current.map(t => t.id === id ? { ...t, status: oldStatus } : t))
            setError("Couldn't update that task. Check your connection and try again.")
        }
    }

    const todo = tasks.filter(t => t.status === "todo")
    const done = tasks.filter(t => t.status === "done")
    const visible = [...todo, ...done].slice(0,5)

    return (
        <div className="space-y-2">
            {error && <p role="alert" className="text-sm text-danger mb-3">{error}</p>}
            {visible.length === 0 ? (
                <p className="text-sm text-slate-500">No tasks remaining. Nice work.</p>
            ) : (
                visible.map(task => {
                    const isDone = task.status === "done"
                    return (
                        <div 
                            key={task.id}
                            className={`flex items-center gap-3 transition-opacity ${isDone ? "opacity-50" : ""}`}
                        >
                            <button
                                role="checkbox"
                                aria-checked={isDone}
                                aria-label={task.title}
                                onClick={() => handleToggle(task.id)}
                                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                                    isDone
                                        ? "bg-accent border-accent"
                                        : "border-slate-300 hover:border-accent"
                                }`}
                            />
                            <p className={`text-sm text-slate-900 flex-1 truncate ${isDone ? "line-through" : ""}`}>
                                {task.title}
                            </p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${priorityStyles[task.priority as keyof typeof priorityStyles]}`}>
                                {task.priority}
                            </span>
                        </div>
                    )
                })
            )}
        </div>
    )
}