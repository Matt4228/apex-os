"use client"

import { useState } from "react"
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { deleteScheduleBlock, updateBlockOrder } from "@/app/actions/schedule"
import DayColumn from "./DayColumn"
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function ScheduleGrid({ initialBlocks }: { initialBlocks: Block[] }) {
    const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
    const [editingBlock, setEditingBlock] = useState<Block | null>(null)

    const sensors = useSensors(useSensor(PointerSensor))

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const activeBlock = blocks.find(b => b.id === active.id)
        if (!activeBlock) return

        const dayBlocks = blocks
            .filter(b => b.dayOfWeek === activeBlock.dayOfWeek)
            .sort((a, b) => a.sortOrder - b.sortOrder)

        const oldIndex = dayBlocks.findIndex(b => b.id === active.id)
        const newIndex = dayBlocks.findIndex(b => b.id === over.id)

        if (oldIndex === -1 || newIndex === -1) return

        const reordered = arrayMove(dayBlocks, oldIndex, newIndex)

        setBlocks(current => [
            ...current.filter(b => b.dayOfWeek !== activeBlock.dayOfWeek),
            ...reordered.map((b, i) => ({ ...b, sortOrder: i})),
        ])

        updateBlockOrder(reordered.map(b => b.id))
    }

    function handleCreate(block: Block) {
        setBlocks(current => [...current, block])
    }

    function handleDelete(id: string) {
        setBlocks(current => current.filter(b => b.id !== id))
        deleteScheduleBlock(id)
    }

    function handleEdit(block: Block) {
        setEditingBlock(block)
    }

    function handleUpdated(updated: Block) {
        setBlocks(current => 
            current.map(b => b.id === updated.id ? updated : b)
        )
        setEditingBlock(null)
    }

    return (
        <div>
            {editingBlock && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-x1 border border-slate-200 p-5 w-full max-w-sm">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Edit Block</h3>
                        <BlockForm 
                            day={editingBlock.dayOfWeek}
                            block={editingBlock}
                            onUpdated={handleUpdated}
                            onCancel={() => setEditingBlock(null)}
                        />
                    </div>
                </div>
            )}

            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8">
                    {DAYS.map(day => {
                        const dayBlocks = blocks
                            .filter(b => b.dayOfWeek === day)
                            .sort((a, b) => a.sortOrder - b.sortOrder )

                        return (
                            <DayColumn 
                                key={day}
                                day={day}
                                blocks={dayBlocks}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onCreated={handleCreate}
                            />
                        )
                    })}
                </div>
            </DndContext>
        </div>
    )
}