"use client"

import { useEffect, useRef, useState } from "react"
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import { deleteScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { SCROLL_TO_HOUR, timeToMinutes, minutesToTime, pixelsToMinutes, snapToGrid } from "@/lib/schedule-time"
import HourLabels from "./HourLabels"
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
const PX_PER_MINUTE = 1

export default function ScheduleGrid({ initialBlocks }: { initialBlocks: Block[] }) {
    const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
    const [editingBlock, setEditingBlock] = useState<Block | null>(null)
    const [createDraft, setCreateDraft] = useState<{ day: string; startTime: string; endTime: string } | null>(null)
    const [activeDay, setActiveDate] = useState(() => DAYS[new Date().getDay()])
    const scrollRef = useRef<HTMLDivElement>(null)
    const todayName = DAYS[new Date().getDay()]

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
    )

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * 60 * PX_PER_MINUTE })
    }, [])

    function handleDelete(id: string) {
        setBlocks(current => current.filter(b => b.id !== id))
        deleteScheduleBlock(id)
    }

    function handleEdit(block: Block) {
        setEditingBlock(block)
    }

    function handleUpdated(updated: Block) {
        setBlocks(current => current.map(b => b.id === updated.id ? updated : b))
        setEditingBlock(null)
    }

    function handleCreated(block: Block) {
        setBlocks(current => [...current, block])
        setCreateDraft(null)
    }

    function handleCreateDraft(day: string, startMinutes: number, endMinutes: number) {
        setCreateDraft({
            day,
            startTime: minutesToTime(startMinutes),
            endTime: minutesToTime(endMinutes),
        })
    }

    function persist(block: Block) {
        const formData = new FormData()
        formData.set("dayOfWeek", block.dayOfWeek)
        formData.set("label", block.label)
        formData.set("startTime", block.startTime)
        formData.set("endTime", block.endTime)
        formData.set("category", block.category ?? "")
        formData.set("color", block.color ?? "")
        updateScheduleBlock(block.id, formData)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over, delta } = event
        const block = blocks.find(b => b.id === active.id)
        if (!block) return 

        const duration = timeToMinutes(block.endTime) - timeToMinutes(block.startTime)
        const rawStart = timeToMinutes(block.startTime) + pixelsToMinutes(delta.y, PX_PER_MINUTE)
        const clampedStart = Math.min(Math.max(rawStart, 0), 24 * 60 - duration)
        const newStartMinutes = snapToGrid(clampedStart, 5)
        const newEndMinutes = newStartMinutes + duration
        const newDayOfWeek = (over?.id as string) ?? block.dayOfWeek

        const updated: Block = {
            ...block,
            dayOfWeek: newDayOfWeek,
            startTime: minutesToTime(newStartMinutes),
            endTime: minutesToTime(newEndMinutes),
        }

        setBlocks(current => current.map(b => (b.id === updated.id ? updated : b)))
        persist(updated)
    }

    function handleResize(blockId: string, newEndTime: string) {
        const block = blocks.find(b => b.id === blockId)
        if (!block) return

        const updated: Block = { ...block, endTime: newEndTime }
        setBlocks(current => current.map(b => (b.id === updated.id ? updated : b)))
        persist(updated)
    }

    return (
        <div>
            {(editingBlock || createDraft) && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 w-full max-w-sm">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">
                            {editingBlock ? "Edit Block" : "New Block"}
                        </h3>
                        <BlockForm 
                            day={editingBlock ? editingBlock.dayOfWeek : createDraft!.day}
                            block={editingBlock ?? undefined}
                            initialStartTime={createDraft?.startTime}
                            initialEndTime={createDraft?.endTime}
                            onCreated={handleCreated}
                            onUpdated={handleUpdated}
                            onCancel={() => {
                                setEditingBlock(null)
                                setCreateDraft(null)
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Mobile day picker */}
            <div className="md:hidden flex gap-1 overflow-x-auto pb-2 mb-4">
                {DAYS.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDate(day)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            activeDay === day
                                ? "bg-primary text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        {day.slice(0,3)}
                    </button>
                ))}
            </div>

            {/* Desktop day headers */}
            <div className="hidden md:flex mb-2">
                <div className="w-14 flex-shrink-0" />
                {DAYS.map(day => (
                    <div key={day} className="flex-1 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {day.slice(0, 3)}
                    </div>
                ))}
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div ref={scrollRef} className="flex overflow-y-auto max-h-[70vh] border border-slate-200 rounded-xl">
                    <HourLabels pxPerMinute={PX_PER_MINUTE} />

                    {/* Mobile: singled day */}
                    <div className="flex-1 md:hidden">
                        <DayColumn
                            day={activeDay}
                            blocks={blocks.filter(b => b.dayOfWeek === activeDay)}
                            pxPerMinute={PX_PER_MINUTE}
                            isToday={activeDay === todayName}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onResize={handleResize}
                            onCreateDraft={handleCreateDraft}
                        />
                    </div>

                    {/* Desktop: full week */}
                    <div className="hidden md:flex flex-1">
                        {DAYS.map(day => (
                            <DayColumn
                                key={day}
                                day={day}
                                blocks={blocks.filter(b => b.dayOfWeek === day)}
                                pxPerMinute={PX_PER_MINUTE}
                                isToday={day === todayName}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                                onResize={handleResize}
                                onCreateDraft={handleCreateDraft}
                            />
                        ))}
                    </div>
                </div>
            </DndContext>

            
        </div>
    )
}