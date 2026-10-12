"use client"

import { useEffect, useState } from "react"
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks"
import { failureMessage } from "@/lib/optimistic"
import { sortTasksByPriority } from "@/lib/dashboardStats"
import { sortSteps } from "@/lib/goalProgress"
import TaskCard from "./TaskCard"
import CreateTaskForm from "./CreateTaskForm"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { UndoToast } from "../ui/undo-toast"
import type { GoalOption, Task } from "./types"

/** How long a new or edited task stays highlighted after it lands in its sorted place */
export const HIGHLIGHT_MS = 2000

export default function TaskList({
  initialTasks,
  goalId,
  goals,
  header,
}: {
  initialTasks: Task[]
  /** On a goal's page: new tasks become steps of this goal, and the list is in step order */
  goalId?: string
  /** Goals to offer in the create and edit forms; leave out to hide the goal picker */
  goals?: GoalOption[]
  /** Rendered above the list with the tasks currently shown, so a summary stays in sync */
  header?: (tasks: Task[]) => React.ReactNode
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { pending, undo, requestDelete, isHidden } = useUndoableDelete("task", deleteTask, setError)
  // A new or edited task can land anywhere in the sorted list, so it is highlighted and announced
  const [highlight, setHighlight] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlight])

  async function handleToggle(id: string, newStatus: string) {
    const oldStatus = tasks.find(t => t.id === id)?.status
    if (!oldStatus) return
    setError(null)
    setTasks(current => current.map(t => t.id === id ? { ...t, status: newStatus } : t))

    const problem = await failureMessage(updateTaskStatus(id, newStatus), "update that task")
    if (problem) {
      setTasks(current => current.map(t => t.id === id ? { ...t, status: oldStatus } : t))
      setError(problem)
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
    setHighlight({ id, message: `Saved "${updated.title}"` })
  }

  function handleCreate(task: Task) {
    // The server sends back only the goalId; attach the title so the goal link shows right away
    const goal = goals?.find(g => g.id === task.goalId) ?? null
    setTasks(current => [{ ...task, goal }, ...current])
    setHighlight({ id: task.id, message: `Added "${task.title}"` })
  }

  const visibleTasks = tasks.filter(t => !isHidden(t.id))
  // On a goal's page the next step is always first; everywhere else, the same order the server sends
  const ordered = goalId ? sortSteps(visibleTasks) : sortTasksByPriority(visibleTasks)
  const todo = ordered.filter(t => t.status === "todo")
  const done = ordered.filter(t => t.status === "done")

  return (
    <div>
      {header?.(visibleTasks)}
      {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}
      <p role="status" className="sr-only">{highlight?.message}</p>
      <div className="space-y-2 mb-6">
        {todo.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            goals={goals}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            isPending={isPending}
            highlighted={highlight?.id === task.id}
          />
        ))}
        <CreateTaskForm onCreated={handleCreate} goalId={goalId} goals={goals} />
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
                goals={goals}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                isPending={isPending}
                highlighted={highlight?.id === task.id}
              />
            ))}
          </div>
        </div>
      )}
      {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
    </div>
  )
}