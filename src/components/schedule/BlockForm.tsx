"use client"

import { useState } from "react"
import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { catProps } from "@/lib/categoryColor"

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
    categories = [],
    onCreated,
    onUpdated,
    onCancel,
}: {
    day: string
    block?: Block
    initialStartTime?: string
    initialEndTime?: string
    /** Categories already in use, offered as suggestions so the same name (and color) is typed each time */
    categories?: string[]
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

            {/* The block's color comes from its category, so the dot previews it as you type */}
            <div className="relative">
                <Input
                    name="category"
                    placeholder="Category (optional)"
                    aria-label="Category"
                    list="block-categories"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="pr-8"
                />
                <span
                    {...catProps(category)}
                    data-testid="category-dot"
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-cat-solid"
                />
                <datalist id="block-categories">
                    {categories.map(name => (
                        <option key={name} value={name} />
                    ))}
                </datalist>
            </div>

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