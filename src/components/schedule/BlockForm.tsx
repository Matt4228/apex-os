"use client"

import { useState } from "react"
import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { STANDARD_CATEGORIES, catProps, uniqueCategories } from "@/lib/categoryColor"

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

// Radix reserves the empty string, so "no category" and "make a new one" need values of their own
const NONE = "__none__"
const NEW = "__new__"

/** A category's color dot beside its name */
function CategoryName({ name }: { name: string }) {
    return (
        <span className="inline-flex items-center gap-2">
            <span {...catProps(name)} aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-cat-solid" />
            {name}
        </span>
    )
}

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
    /** Categories already in use (blocks, goals, habits), offered after the standard ones */
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
    const [addingNew, setAddingNew] = useState(false)

    // Standard categories first, then the user's own; a name matching a standard one (any case) is that one
    const standardKeys = new Set(STANDARD_CATEGORIES.map(name => name.toLowerCase()))
    const yours = uniqueCategories([...categories, block?.category]).filter(name => !standardKeys.has(name.toLowerCase()))
    const options = [...STANDARD_CATEGORIES, ...yours]
    const chosen = options.find(name => name.toLowerCase() === category.trim().toLowerCase())
    const selectValue = addingNew ? NEW : chosen ?? NONE

    function pickCategory(value: string) {
        setAddingNew(value === NEW)
        setCategory(value === NEW || value === NONE ? "" : value)
    }

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

            {/* The block's color comes from its category: standard ones, then the user's own, then a new one */}
            <Select value={selectValue} onValueChange={pickCategory}>
                <SelectTrigger
                    aria-label="Category"
                    className="h-10 w-full justify-between border-line bg-surface px-3 text-sm text-ink hover:border-line-strong"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    <SelectSeparator />
                    <SelectGroup>
                        <SelectLabel>Standard</SelectLabel>
                        {STANDARD_CATEGORIES.map(name => (
                            <SelectItem key={name} value={name}>
                                <CategoryName name={name} />
                            </SelectItem>
                        ))}
                    </SelectGroup>
                    {yours.length > 0 && (
                        <SelectGroup>
                            <SelectLabel>Yours</SelectLabel>
                            {yours.map(name => (
                                <SelectItem key={name} value={name}>
                                    <CategoryName name={name} />
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    )}
                    <SelectSeparator />
                    <SelectItem value={NEW}>New category...</SelectItem>
                </SelectContent>
            </Select>

            {addingNew && (
                <div className="relative">
                    <Input
                        aria-label="New category name"
                        placeholder="Name your category"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="pr-8"
                        autoFocus
                    />
                    {/* Its color, as soon as there is a name to take it from */}
                    <span
                        {...catProps(category)}
                        data-testid="new-category-dot"
                        aria-hidden="true"
                        className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-cat-solid"
                    />
                </div>
            )}

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