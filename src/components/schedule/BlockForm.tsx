"use client"

import { useState } from "react"
import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

const COLORS = [
    "#1a1a2e", "#533AB7", "#0F6E56", "#BA7517",
    "#3B6D11", "#C0392B", "#2980B9", "#8E44AD",
]

export default function BlockForm({
    day,
    block,
    onCreated,
    onUpdated,
    onCancel,
}: {
    day: string
    block?: Block
    onCreated?: (block: Block) => void
    onUpdated?: (block: Block) => void
    onCancel: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [color, setColor] = useState(block?.color ?? "#1a1a2e")
    const [label, setLabel] = useState(block?.label ?? "")
    const [startTime, setStartTime] = useState(block?.startTime ?? "09:00")
    const [endTime, setEndTime] = useState(block?.endTime ?? "10:00")
    const [category, setCategory] = useState(block?.category ?? "")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.set("dayOfWeek", day)
        formData.set("label", label)
        formData.set("startTime", startTime)
        formData.set("endTime", endTime)
        formData.set("category", category)
        formData.set("color", color)

        console.log("Submitting with dayOfWeek:", day, "label:", label)
        
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
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <Input
                name="label"
                placeholder="Block label"
                value={label}
                onChange={e => setLabel(e.target.value)}
                required
                autoFocus 
            />

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

            <Input 
                name="category" 
                placeholder="Category (optional)" 
                value={category}
                onChange={e => setCategory(e.target.value)} 
            />

            <div className="flex gap-1.5 flex-wrap">
                {COLORS.map(c => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-slate-900 scale 110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            { error && <p className="text-xs text-red-500">{error}</p> }
            
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