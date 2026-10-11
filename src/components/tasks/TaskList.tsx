"use client"

import { useState } from "react"
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks"
import { succeeded } from "@/lib/optimistic"
import TaskCard from "./TaskCard"
import CreateTaskForm from "./CreateTaskForm"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { UndoToast } from "../ui/undo-toast"

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
  const { pending, undo, requestDelete, isHidden } = useUndoableDelete(deleteTask, setError)

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

  function handleDelete(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    setError(null)
    requestDelete(id, task.title)
  }

  function handleUpdate(id: string, updated: Partial<Task>) {
    setTasks(current => 
      current.map(t => t.id === id ? { ...t, ...updated } : t)
    )
  }

  function handleCreate(task: Task) {
    setTasks(current => [task, ...current])
  }

  const visibleTasks = tasks.filter(t => !isHidden(t.id))
  const todo = visibleTasks.filter(t => t.status === "todo")
  const done = visibleTasks.filter(t => t.status === "done")

  return (
    <div>
      {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}
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
          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
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
      {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
    </div>
  )
}