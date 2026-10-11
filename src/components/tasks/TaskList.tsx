"use client"

import { useState } from "react"
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks"
import { restoreAt, succeeded } from "@/lib/optimistic"
import TaskCard from "./TaskCard"
import CreateTaskForm from "./CreateTaskForm"

type Task = {
  id: string
  title: string
  status: string
  priority: string
  dueDate: Date | null
  completedAt: Date | null
}

export default function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle(id: string, newStatus: string) {
    const oldStatus = tasks.find(t => t.id === id)?.status
    if (!oldStatus) return
    setError(null)
    setTasks(current => current.map(t => t.id === id ? { ...t, status: newStatus } : t))

    if (!(await succeeded(updateTaskStatus(id, newStatus)))) {
      setTasks(current => current.map(t => t.id === id ? { ...t, status: oldStatus } : t))
      setError("Couldn't update that task. Check your connection and try again.")
    }
  }

  async function handleDelete(id: string) {
    const index = tasks.findIndex(t => t.id === id)
    const task = tasks[index]
    if (!task) return
    setError(null)
    setTasks(current => current.filter(t => t.id !== id))

    if (!(await succeeded(deleteTask(id)))) {
      setTasks(current => restoreAt(current, task, index))
      setError(`Couldn't delete "${task.title}". Check your connection and try again.`)
    }
  }

  function handleUpdate(id: string, updated: Partial<Task>) {
    setTasks(current => 
      current.map(t => t.id === id ? { ...t, ...updated } : t)
    )
  }

  function handleCreate(task: Task) {
    setTasks(current => [task, ...current])
  }

  const todo = tasks.filter(t => t.status === "todo")
  const done = tasks.filter(t => t.status === "done")

  return (
    <div>
      {error && <p role="alert" className="text-sm text-danger mb-3">{error}</p>}
      <div className="space-y-2 mb-6">
        {todo.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            isPending={isPending}
          />
        ))}
        <CreateTaskForm onCreated={handleCreate} />
      </div>

      {done.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Completed
          </p>
          <div className="space-y-2">
            {done.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}