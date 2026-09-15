"use client"

import { useRef, useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { timeToMinutes, layoutOverlaps, minutesToPixels, pixelsToMinutes, snapToGrid } from "@/lib/schedule-time"
import TimeBlock from "./TimeBlock"
import CurrentTimeLine from "./CurrentTimeLine"

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

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MIN_DRAFT_MINUTES = 5
const LONG_PRESS_MS = 350
const MOVE_CANCEL_PX = 8

export default function DayColumn({
    day,
    blocks,
    pxPerMinute,
    isToday,
    onDelete,
    onEdit,
    onResize,
    onCreateDraft,
}: {
    day: string
    blocks: Block[]
    pxPerMinute: number
    isToday: boolean
    onDelete: (id: string) => void
    onEdit: (block: Block) => void
    onResize: (blockId: string, newEndTime: string) => void
    onCreateDraft: (day: string, startMinutees: number, endMinutes: number) => void
}) {
    const { setNodeRef } = useDroppable({ id: day })
    const containerRef = useRef<HTMLDivElement>(null)
    const [draft, setDraft] = useState<{ startMinutes: number; endMinutes: number} | null>(null)

    function setRefs(node: HTMLDivElement | null) {
        containerRef.current = node
        setNodeRef(node)
    }
    
    const positioned = layoutOverlaps(
        blocks.map(b => ({
            id: b.id,
            startMinutes: timeToMinutes(b.startTime),
            endMinutes: timeToMinutes(b.endTime),
        }))
    )

    function handlePointerDown(e: React.PointerEvent) {
        if (e.target !== e.currentTarget || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const originY = e.clientY
        if (e.pointerType !== "touch") {
            beginCreate(originY, rect)
            return
        }

        let committed = false

        const timer = window.setTimeout(() => {
            committed = true
            window.removeEventListener("pointermove", watchForCancel)
            window.removeEventListener("pointerup", cancel)
            beginCreate(originY, rect)
        }, LONG_PRESS_MS)

        function watchForCancel(moveEvent: PointerEvent) {
            if (Math.abs(moveEvent.clientY - originY) > MOVE_CANCEL_PX) cancel()
        }

        function cancel() {
            if (committed) return
            window.clearTimeout(timer)
            window.removeEventListener("pointermove", watchForCancel)
            window.removeEventListener("pointerup", cancel)
        }

        window.addEventListener("pointermove", watchForCancel)
        window.addEventListener("pointerup", cancel)

    }

    function beginCreate(originY: number, rect: DOMRect) {
        const startMinutes = snapToGrid(pixelsToMinutes(originY - rect.top, pxPerMinute), 5)
        let endMinutes = startMinutes + MIN_DRAFT_MINUTES
        setDraft({ startMinutes, endMinutes })

        function handleMove(moveEvent: PointerEvent) {
            const currentMinutes = snapToGrid(pixelsToMinutes(moveEvent.clientY - rect.top, pxPerMinute), 5)
            endMinutes = Math.max(currentMinutes, startMinutes + MIN_DRAFT_MINUTES)
            setDraft({ startMinutes, endMinutes })
        }

        function handleUp() {
            window.removeEventListener("pointermove", handleMove)
            window.removeEventListener("pointerup", handleUp)
            setDraft(null)
            onCreateDraft(day, startMinutes, endMinutes)
        }

        window.addEventListener("pointermove", handleMove)
        window.addEventListener("pointerup", handleUp)
    }

    return (
        <div 
            ref={setRefs}
            onPointerDown={handlePointerDown}
            className="relative flex-1 border-l border-slate-100 touch-none"
            style={{ height: 24 * 60 * pxPerMinute}}
        >
            {HOURS.map(hour => (
                <div 
                    key={hour}
                    className="absolute inset-x-0 border-t border-slate-100 pointer-events-none"
                    style={{ top: hour * 60 * pxPerMinute }}
                />
            ))}

            {isToday && <CurrentTimeLine pxPerMinute={pxPerMinute} />}

            {draft && (
                <div 
                    className="absolute inset-x-1 rounded-md border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
                    style = {{
                        top: minutesToPixels(draft.startMinutes, pxPerMinute),
                        height: minutesToPixels(draft.endMinutes - draft.startMinutes, pxPerMinute),
                    }}
                />
            )}

            {positioned.map(pos => {
                const block = blocks.find(b => b.id === pos.id)!
                const startMinutes = timeToMinutes(block.startTime)
                const endMinutes = timeToMinutes(block.endTime)

                return (
                    <TimeBlock 
                        key={block.id}
                        block={block}
                        top={minutesToPixels(startMinutes, pxPerMinute)}
                        height={minutesToPixels(endMinutes - startMinutes, pxPerMinute)}
                        column={pos.column}
                        columnCount={pos.columnCount}
                        pxPerMinute={pxPerMinute}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onResize={onResize}
                    />
                )
            })}
        </div>
    )
}