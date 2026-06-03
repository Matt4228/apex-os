"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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

export default function ScheduleBlock({
    block,
    onDelete,
    onEdit,
}: {
    block: Block
    onDelete: (id: string) => void
    onEdit: (block: Block) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: block.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5 group"
        >
            <button
                {...attributes}
                {...listeners}
                className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0"
            >
                ⠿
            </button>
            
            <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: block.color ?? "#1a1a2e" }}
            />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{block.label}</p>
                <p className="text-xs text-slate-400">
                    {block.startTime} - {block.endTime}
                    {block.category && ` · ${block.category}`}
                </p>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(block)}
                    className="text-xs text-slate-400 hover:text-sltae-700 px-2 py-1 rounded hover:bg-slate-50"
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(block.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                >
                    ×
                </button>
            </div>
        </div>
    )
}