"use client"

import { useState } from "react"
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import ScheduleBlock from "./ScheduleBlock"
import BlockForm from "./BlockForm"

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

export default function DayColumn({
    day,
    blocks,
    onDelete,
    onEdit,
    onCreated,
}: {
    day: string
    blocks: Block[]
    onDelete: (id: string) => void
    onEdit: (block: Block) => void
    onCreated: (block: Block) => void
}) {
    const [showForm, setShowForm] = useState(false)
    const { setNodeRef } = useDroppable({ id: day })

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {day}
                </h3>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                >
                    + Add
                </button>
            </div>

            <div ref={setNodeRef} className="flex flex-col gap-1.5 min-h-[40px]">
                <SortableContext
                    items={blocks.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {blocks.map(block => (
                        <ScheduleBlock
                            key={block.id}
                            block={block}
                            onDelete={onDelete}
                            onEdit={onEdit}
                        />
                    ))}
                </SortableContext>
            </div>

            {showForm && (
                <BlockForm
                    day={day}
                    onCreated={(block) => {
                        onCreated(block)
                        setShowForm(false)
                    }}
                    onCancel={() => setShowForm(false)}
                />
            )}
        </div>
    )
}