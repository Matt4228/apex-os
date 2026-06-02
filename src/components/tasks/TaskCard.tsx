"use client"

import { format } from "date-fns"
import { useState } from "react"
import { updateTaskStatus, deleteTask, updateTask } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

export default function TaskCard({
    task,
    onToggle,
    onDelete,
    onUpdate,
    isPending,
}: { 
    task: Task
    onToggle: (id: string, status: string) => void
    onDelete: (id: string) => void
    onUpdate: (id: string, udpated: Partial<Task>) => void
    isPending: boolean
}) {
    const [editing, setEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const isDone = task.status === "done"

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const result = await updateTask(task.id, formData)
        if (!result?.error) {
            onUpdate(task.id, {
                title: String(formData.get("title")),
                priority: String(formData.get("priority")),
                dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null,
            })
            setEditing(false)
        }
        setLoading(false)
    }

    if (editing) {
        return (
            <form onSubmit={handleEdit} className="bg-white border border-accent rounded-lg p-4 space-y-3">
                <Input name="title" defaultValue={task.title} required autoFocus />
                <div className="flex gap-2">
                    <select 
                        name="priority"
                        defaultValue={task.priority}
                        className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                    </select>
                    <Input 
                        name="dueDate"
                        type="date"
                        defaultValue={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
                        className="flex-1"
                    />
                </div>
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
        <div className={`bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3 transition-opacity ${isDone ? "opactiy-60" : ""}`}>
            <button 
                onClick={() => onToggle(task.id, isDone ? "todo" : "done")}
                disabled={isPending}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    isDone
                        ? "bg-accent border-accent"
                        : "border-slate-300 hover:border-accent"
                    }`}
            />

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-900 transition-all ${isDone ? "line-through" : ""}`}>
                    {task.title}
                </p>
                <div className="flex flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyles[task.priority as keyof typeof priorityStyles]}`}>
                        {task.priority}
                    </span>
                    {task.dueDate && (
                        <span className="text-xs text-slate-400">
                            Due {format(new Date(task.dueDate), "MMM d")}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
                {!isDone && (
                    <button 
                        onClick={() => setEditing(true)}
                        className="text-xs text-slate-400 hover:text-accent transition-colors leading-none"
                    >
                        Edit
                    </button>
                )}
                <button
                    onClick={() => onDelete(task.id)}
                    disabled={isPending}
                    className="text-slate-300 hover:text-danger transition-colors text-lg leading-none"
                >
                    ×
                </button>
            </div>
        </div>
    )
}