"use client"

import { useState } from "react"
import { createTask } from "@/app/actions/tasks"
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

export default function CreateTaskForm({ onCreated }: { onCreated: (task: Task) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await createTask(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (result?.task) {
      onCreated(result.task)
    }

    setLoading(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-line-strong rounded-lg p-3 text-sm text-ink-muted hover:border-ink-muted hover:text-ink-soft transition-colors text-left"
      >
        + Add a task
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg p-4 space-y-3">
      <Input
        name="title"
        placeholder="Task title"
        required
        autoFocus
      />

      <div className="flex gap-2">
        <select
          name="priority"
          defaultValue="medium"
          className="flex h-10 rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>

        <Input
          name="dueDate"
          type="date"
          className="flex-1"
        />
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Adding..." : "Add task"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}