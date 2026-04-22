"use client"

import { useOptimistic, useTransition } from "react"
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks"
import TaskCard from "./TaskCard"
import CreateTaskForm from "./CreateTaskForm"
import { string } from "zod"

type Task = {
    id: string
    title: string
    status: string
    priority: string
    dueDate: Date | null
    completedAt: Date | null
}

export default function TaskList({ initialTasks }: { initialTasks: Task[] }) {
    const [isPending, startTransition] = useTransition()
    const [tasks, setOptimisitcTasks] = useOptimistic(
        initialTasks,
        (current, { type, id, status }: { type: string; id: string; status?: string }) => {
            if (type === "toggle") {
                return current.map(t => 
                    t.id === id ? { ...t, status: status! } : t
                )
            }
            if (type === "delete") {
                return current.filter(t => t.id !== id)
            }
            return current
        }
    )

    function handleToggle(id: string, status: string) {
        startTransition(async () => {
            setOptimisitcTasks({ type: "toggle", id, status })
            await updateTaskStatus(id, status)
        })
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            setOptimisitcTasks({ type: "delete", id})
            await deleteTask(id)
        })
    }

    const todo = tasks.filter(t => t.status === "todo")
    const done = tasks.filter(t => t.status === "done")

    return (
        <div>
            <div className="space-y-2 mb-6">
                {todo.map(task => (
                    <TaskCard 
                        key={task.id}
                        task={task}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        isPending={isPending}
                    />
                ))}
                <CreateTaskForm />
            </div>

            {done.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                        Completed
                    </p>
                    <div className="space-y-2">
                        {done.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onToggle={handleToggle}
                                onDelete={handleDelete}
                                isPending={isPending}                            
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}