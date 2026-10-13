"use client"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Repeat } from "lucide-react"
import { catProps } from "@/lib/categoryColor"
import type { CalendarBlock } from "./types"
import { minutesToTime, pixelsToMinutes, snapToGrid, timeToMinutes } from "@/lib/schedule-time" 


const MIN_DURATION_MINUTES = 5
// Below this height two lines don't fit, so the time moves up beside the label
const ONE_LINE_BELOW_PX = 36

export default function TimeBlock({
    block,
    top,
    height,
    column,
    columnCount,
    pxPerMinute,
    onDelete,
    onEdit,
    onResize,
}: {
    block: CalendarBlock
    top: number
    height: number
    column: number
    columnCount: number
    pxPerMinute: number
    onDelete: (id: string) => void
    onEdit: (block: CalendarBlock) => void
    onResize: (blockId: string, newEndTime: string) => void
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.id,
    })
    
    const [resizeDeltaY, setResizeDeltaY] = useState(0)
    const [resizing, setResizing] = useState(false)

    const widthPct = 100 / columnCount
    const leftPct = widthPct * column
    const previewHeight = Math.max(height + resizeDeltaY, 18)
    const oneLine = previewHeight < ONE_LINE_BELOW_PX
    const repeatIcon = block.repeats && (
        <>
            <Repeat size={11} aria-hidden="true" className="flex-shrink-0 opacity-80" />
            <span className="sr-only">Repeats: </span>
        </>
    )

    function handleResizeStart(e: React.PointerEvent) {
        e.stopPropagation()
        e.preventDefault()
        setResizing(true)

        const startY = e.clientY
        const startMinutes = timeToMinutes(block.startTime)

        function handleMove(moveEvent: PointerEvent) {
            setResizeDeltaY(moveEvent.clientY - startY)
        }

        function handleUp(upEvent: PointerEvent) {
            const finalDeltaY = upEvent.clientY - startY
            const newDurationMinutes = pixelsToMinutes(height + finalDeltaY, pxPerMinute)
            const rawEndMinutes = startMinutes + newDurationMinutes
            const snappedEndMinutes = Math.max(
                snapToGrid(rawEndMinutes, 5),
                startMinutes + MIN_DURATION_MINUTES
            )

            onResize(block.id, minutesToTime(snappedEndMinutes))

            setResizing(false)
            setResizeDeltaY(0)
            window.removeEventListener("pointermove", handleMove)
            window.removeEventListener("pointerup", handleUp)
        }

        window.addEventListener("pointermove", handleMove)
        window.addEventListener("pointerup", handleUp)
    }

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            {...catProps(block.category)}
            onClick={() => onEdit(block)}
            // Colored by category like everything else; with no category the block is neutral
            className={`absolute rounded-md px-2 overflow-hidden group cursor-grab active:cursor-grabbing border bg-cat-tint text-cat-ink hover:border-cat-solid transition-colors ${
                block.changed ? "border-dashed border-cat-solid" : "border-cat-line"
            } ${oneLine ? "py-0.5" : "py-1"}`}
            style={{
                top,
                height: previewHeight,
                left: `${leftPct}%`,
                width: `calc(${widthPct}% - 4px)`,
                transform: CSS.Translate.toString(transform),
                opacity: isDragging ? 0.6 : 1,
                zIndex: isDragging || resizing ? 20 : 1,
            }}
        >
            {oneLine ? (
                <p className="flex items-center gap-1 text-xs leading-tight pointer-events-none">
                    {repeatIcon}
                    <span className="font-semibold truncate">{block.label}</span>
                    <span className="font-mono text-[10px] flex-shrink-0">{block.startTime}</span>
                </p>
            ) : (
                <>
                    <p className="flex items-center gap-1 text-xs font-semibold pointer-events-none">
                        {repeatIcon}
                        <span className="truncate">{block.label}</span>
                    </p>
                    <p className="font-mono text-[10px] truncate pointer-events-none">
                        {block.startTime} to {block.endTime}
                    </p>
                </>
            )}

            <button 
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete(block.id)
                }}
                className="absolute top-0.5 right-1 text-cat-ink/70 hover:text-cat-ink opacity-0 focus-visible:opacity-100 group-hover:opacity-100 transition-opacity text-sm leading-none"
                aria-label={`Delete ${block.label}`}
            >
                ×
            </button>

            <div 
                onPointerDown={handleResizeStart}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 inset-x-0 h-4 cursor-ns-resize touch-none"
            />
        </div>
    )
}