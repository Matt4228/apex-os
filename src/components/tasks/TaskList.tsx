"use client"

import { useState } from "react"
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks"
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

  function handleToggle(id: string, newStatus: string) {
    setTasks(current =>
      current.map(t => t.id === id ? { ...t, status: newStatus } : t)
    )
    updateTaskStatus(id, newStatus)
  }

  function handleDelete(id: string) {
    setTasks(current => current.filter(t => t.id !== id))
    deleteTask(id)
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