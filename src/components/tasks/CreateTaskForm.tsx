"use client"

import { useState } from "react"
import { createTask } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CreateTaskForm() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        await createTask(formData)
        setLoading(false)
        setOpen(false)
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="w-full border border-dashed border-slate-300 rounded-lg p-3 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors text-left"
            >
                + Add a task
            </button>
        )
    }

    return (
        <form action={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
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
                    className="flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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