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
import { failureMessage } from "@/lib/optimistic"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { UndoToast } from "@/components/ui/undo-toast"

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
export const PX_PER_MINUTE = 1

export default function ScheduleGrid({
    initialBlocks,
    pxPerMinute = PX_PER_MINUTE,
}: {
    initialBlocks: Block[]
    /** Height of one minute; the scale comparison page passes a few */
    pxPerMinute?: number
}) {
    const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
    const [editingBlock, setEditingBlock] = useState<Block | null>(null)
    const [createDraft, setCreateDraft] = useState<{ day: string; startTime: string; endTime: string } | null>(null)
    const [activeDay, setActiveDate] = useState(() => DAYS[new Date().getDay()])
    const scrollRef = useRef<HTMLDivElement>(null)
    const todayName = DAYS[new Date().getDay()]
    const [error, setError] = useState<string | null>(null)
    const { pending, undo, requestDelete, isHidden } = useUndoableDelete("schedule-block", deleteScheduleBlock, setError)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
    )

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * 60 * pxPerMinute })
    }, [pxPerMinute])

    
    function closeDialog() {
        setEditingBlock(null)
        setCreateDraft(null)
    }

    const dialogOpen = editingBlock !== null || createDraft !== null

    useEffect(() => {
        if (!dialogOpen) return
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeDialog()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [dialogOpen])

    function handleDelete(id: string) {
      const block = blocks.find(b => b.id === id)
      if (!block) return
      setError(null)
      requestDelete(id, block.label)
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

    async function persist(updated: Block, previous: Block) {
        const formData = new FormData()
        formData.set("dayOfWeek", updated.dayOfWeek)
        formData.set("label", updated.label)
        formData.set("startTime", updated.startTime)
        formData.set("endTime", updated.endTime)
        formData.set("category", updated.category ?? "")
        formData.set("color", updated.color ?? "")
        setError(null)

        const problem = await failureMessage(updateScheduleBlock(updated.id, formData), `move "${previous.label}"`)
        if (problem) {
            setBlocks(current => current.map(b => b.id === previous.id ? previous : b))
            setError(`${problem} It's back where it was.`)
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over, delta } = event
        const block = blocks.find(b => b.id === active.id)
        if (!block) return 

        const duration = timeToMinutes(block.endTime) - timeToMinutes(block.startTime)
        const rawStart = timeToMinutes(block.startTime) + pixelsToMinutes(delta.y, pxPerMinute)
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
        persist(updated, block)
    }

    function handleResize(blockId: string, newEndTime: string) {
        const block = blocks.find(b => b.id === blockId)
        if (!block) return

        const updated: Block = { ...block, endTime: newEndTime }
        setBlocks(current => current.map(b => (b.id === updated.id ? updated : b)))
        persist(updated, block)
    }

    return (
        <div>
            {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}
            {(editingBlock || createDraft) && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div 
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="block-dialog-title"
                        className="bg-surface rounded-xl border border-line p-5 w-full max-w-sm"
                    >
                        <h3 id="block-dialog-title" className="text-sm font-semibold text-ink mb-3">
                            {editingBlock ? "Edit Block" : "New Block"}
                        </h3>
                        <BlockForm 
                            day={editingBlock ? editingBlock.dayOfWeek : createDraft!.day}
                            block={editingBlock ?? undefined}
                            initialStartTime={createDraft?.startTime}
                            initialEndTime={createDraft?.endTime}
                            onCreated={handleCreated}
                            onUpdated={handleUpdated}
                            onCancel={closeDialog}
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
                                ? "bg-primary-ink text-canvas"
                                : "bg-sunken text-ink-soft hover:bg-sunken-strong"
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
                    <div key={day} className="flex-1 text-center text-xs font-semibold text-ink-muted uppercase tracking-wide">
                        {day.slice(0, 3)}
                    </div>
                ))}
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div ref={scrollRef} className="flex overflow-y-auto max-h-[70vh] border border-line rounded-xl">
                    <HourLabels pxPerMinute={pxPerMinute} />

                    {/* Mobile: singled day */}
                    <div className="flex-1 md:hidden">
                        <DayColumn
                            day={activeDay}
                            blocks={blocks.filter(b => b.dayOfWeek === activeDay && !isHidden(b.id))}
                            pxPerMinute={pxPerMinute}
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
                                blocks={blocks.filter(b => b.dayOfWeek === day && !isHidden(b.id))}
                                pxPerMinute={pxPerMinute}
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

            {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
        </div>
    )
}