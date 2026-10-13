"use client"

import { useState } from "react"
import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CategorySelect, useCategories } from "@/components/ui/category-select"

type Block = {
    id: string
    label: string
    startTime: string
    endTime: string
    category: string | null
    color: string | null
    dayOfWeek: string
    sortOrder: number
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function BlockForm({
    day,
    block,
    initialStartTime,
    initialEndTime,
    onCreated,
    onUpdated,
    onCancel,
}: {
    day: string
    block?: Block
    initialStartTime?: string
    initialEndTime?: string
    onCreated?: (block: Block) => void
    onUpdated?: (block: Block) => void
    onCancel: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [label, setLabel] = useState(block?.label ?? "")
    const [dayOfWeek, setDayOfWeek] = useState(block?.dayOfWeek ?? day)
    const [startTime, setStartTime] = useState(block?.startTime ?? initialStartTime ?? "09:00")
    const [endTime, setEndTime] = useState(block?.endTime ?? initialEndTime ?? "10:00")
    const [category, setCategory] = useState(block?.category ?? "")
    const { remember } = useCategories()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.set("dayOfWeek", dayOfWeek)
        formData.set("label", label)
        formData.set("startTime", startTime)
        formData.set("endTime", endTime)
        formData.set("category", category)
        
        if (block) {
            const result = await updateScheduleBlock(block.id, formData)
            if (result?.error) { setError(result.error); setLoading(false); return }
            if (result?.block) onUpdated?.(result.block as Block)
        } else {
            const result = await createScheduleBlock(formData)
            if (result?.error) { setError(result.error); setLoading(false); return }
            if (result?.block) onCreated?.(result.block as Block)
        }

        remember(category)
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="bg-canvas border border-line rounded-lg p-3 space-y-2">
            <Input
                name="label"
                placeholder="Block label"
                value={label}
                onChange={e => setLabel(e.target.value)}
                required
                autoFocus 
            />

            <select
                name="dayOfWeek"
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value)}
                className="w-full rounded-md border border-line px-2 py-1.5 text-sm bg-surface"
            >
                {DAYS.map(d => (
                    <option key={d} value={d}>{d}</option> 
                ))}
            </select>

            <div className="flex gap-2">
                <Input 
                    name="startTime" 
                    type="time" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)} 
                    className="flex-1"
                    required 
                />
                <Input 
                    name="endTime" 
                    type="time" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)} 
                    className="flex-1" 
                    required 
                />
            </div>

            {/* The block's color comes from its category */}
            <CategorySelect defaultValue={block?.category} onChange={setCategory} />

            { error && <p role="alert" className="text-xs text-danger-ink">{error}</p> }
            
            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Saving..." : block ? "Update" : "Add block"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}