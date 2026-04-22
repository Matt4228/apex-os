"use client"

import { format } from "date-fns"

type Task = {
    id: string
    title: string
    status: string
    priority: string
    dueDate: Date | null
    completedAt: Date | null
}

const priorityStyles = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
}

export default function TaskCard({
    task,
    onToggle,
    onDelete,
    isPending,
}: { 
    task: Task
    onToggle: (id: string, status: string) => void
    onDelete: (id: string) => void
    isPending: boolean
}) {
    const isDone = task.status === "done"

    return (
        <div className={`bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3 transition-opacity ${isDone ? "opactiy-60" : ""}`}>
            <button 
                onClick={() => onToggle(task.id, isDone ? "todo" : "done")}
                disabled={isPending}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0  transition-colors ${
                    isDone
                        ? "bg-slate-900 border-slate-900"
                        : "border-slate-300 hover:border-slate-900"
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

            <button
                onClick={() => onDelete(task.id)}
                disabled={isPending}
                className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
            >
                x
            </button>
        </div>
    )
}