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
import { formatDateOnly, parseDateOnly } from "@/lib/dates"
import { occurrences, type Exception } from "@/lib/occurrences"
import { SCROLL_TO_HOUR, timeToMinutes, minutesToTime, pixelsToMinutes, snapToGrid } from "@/lib/schedule-time"
import HourLabels from "./HourLabels"
import DayColumn from "./DayColumn"
import BlockForm, { type Saved } from "./BlockForm"
import { fieldsOf, toFormData, whyNotMove } from "./blockFields"
import type { CalendarBlock, Series } from "./types"
import { failureMessage } from "@/lib/optimistic"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { useStoredValue } from "@/lib/useStoredToggles"
import { UndoToast } from "@/components/ui/undo-toast"

/** Heights of one minute. Large makes a 10-minute block easy to grab (walkthrough note #59) */
export const ZOOMS = [
    { id: "fit", label: "Fit", pxPerMinute: 0.8 },
    { id: "comfortable", label: "Comfortable", pxPerMinute: 1.2 },
    { id: "large", label: "Large", pxPerMinute: 1.8 },
] as const
const DEFAULT_ZOOM = "comfortable"

/** A week of the calendar: seven dated columns, built from the user's blocks and their changed days */
export default function ScheduleGrid({
    initialBlocks,
    initialExceptions = [],
    days,
    today,
    pxPerMinute: fixedPxPerMinute,
}: {
    initialBlocks: Series[]
    initialExceptions?: Exception[]
    /** The week's seven days, Sunday first, as "YYYY-MM-DD" */
    days: string[]
    /** The user's today, "YYYY-MM-DD" */
    today: string
    /** Height of one minute. Leave it out to use the zoom control, remembered in this browser */
    pxPerMinute?: number
}) {
    const [storedZoom, setZoom] = useStoredValue("apex.schedule.zoom")
    const zoom = ZOOMS.find(z => z.id === storedZoom) ?? ZOOMS.find(z => z.id === DEFAULT_ZOOM)!
    const pxPerMinute = fixedPxPerMinute ?? zoom.pxPerMinute
    const [blocks, setBlocks] = useState<Series[]>(initialBlocks)
    const [exceptions, setExceptions] = useState<Exception[]>(initialExceptions)
    const [editing, setEditing] = useState<{ block: Series; day: string } | null>(null)
    const [createDraft, setCreateDraft] = useState<{ day: string; startTime: string; endTime: string } | null>(null)
    const [activeDay, setActiveDay] = useState(() => (days.includes(today) ? today : days[0]))
    const scrollRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const { pending, undo, requestDelete, isHidden } = useUndoableDelete("schedule-block", deleteScheduleBlock, setError)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
    )

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * 60 * pxPerMinute })
    }, [pxPerMinute])

    // Every block on every day of the week, keyed so a series' days don't collide when dragged
    const shown: CalendarBlock[] = occurrences(blocks.filter(b => !isHidden(b.id)), exceptions, days[0], days[6]).map(o => ({
        ...o,
        id: `${o.blockId}|${o.originalDate}`,
    }))
    const blocksOn = (day: string) => shown.filter(o => o.date === day)
    const seriesOf = (shownBlock: CalendarBlock) => blocks.find(b => b.id === shownBlock.blockId)

    function closeDialog() {
        setEditing(null)
        setCreateDraft(null)
    }

    const dialogOpen = editing !== null || createDraft !== null

    useEffect(() => {
        if (!dialogOpen) return
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") closeDialog()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [dialogOpen])

    /** Put a saved block and its remaining changed days into the grid */
    function apply({ block, exceptions: blockExceptions }: Saved) {
        setBlocks(current => (current.some(b => b.id === block.id) ? current.map(b => (b.id === block.id ? block : b)) : [...current, block]))
        setExceptions(current => [...current.filter(e => e.blockId !== block.id), ...blockExceptions])
    }

    function handleDelete(key: string) {
        const shownBlock = shown.find(o => o.id === key)
        if (!shownBlock) return
        setError(null)
        requestDelete(shownBlock.blockId, shownBlock.label)
    }

    function handleEdit(shownBlock: CalendarBlock) {
        const block = seriesOf(shownBlock)
        if (block) setEditing({ block, day: shownBlock.date })
    }

    function handleSaved(saved: Saved) {
        apply(saved)
        closeDialog()
    }

    function handleCreateDraft(day: string, startMinutes: number, endMinutes: number) {
        setCreateDraft({
            day,
            startTime: minutesToTime(startMinutes),
            endTime: minutesToTime(endMinutes),
        })
    }

    /** Save a changed block; put it back and explain if the server says no */
    async function persist(updated: Series, previous: Series) {
        setError(null)
        setBlocks(current => current.map(b => (b.id === updated.id ? updated : b)))

        const action = updateScheduleBlock(updated.id, toFormData(fieldsOf(updated)))
        const problem = await failureMessage(action, `move "${previous.label}"`)
        if (problem) {
            setBlocks(current => current.map(b => (b.id === previous.id ? previous : b)))
            setError(`${problem} It's back where it was.`)
            return
        }
        const result = await action
        if (result?.block) apply({ block: result.block, exceptions: result.exceptions ?? [] })
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over, delta } = event
        const shownBlock = shown.find(o => o.id === active.id)
        const block = shownBlock && seriesOf(shownBlock)
        if (!shownBlock || !block) return

        const toDay = (over?.id as string) ?? shownBlock.date
        const reason = whyNotMove(shownBlock, toDay)
        if (reason) {
            setError(reason)
            return
        }

        const duration = timeToMinutes(block.endTime) - timeToMinutes(block.startTime)
        const rawStart = timeToMinutes(block.startTime) + pixelsToMinutes(delta.y, pxPerMinute)
        const clampedStart = Math.min(Math.max(rawStart, 0), 24 * 60 - duration)
        const newStartMinutes = snapToGrid(clampedStart, 5)

        persist(
            {
                ...block,
                // Only a one-off moves to another day, so its date is its start date
                startDate: block.repeat === "none" ? parseDateOnly(toDay) : block.startDate,
                startTime: minutesToTime(newStartMinutes),
                endTime: minutesToTime(newStartMinutes + duration),
            },
            block,
        )
    }

    function handleResize(key: string, newEndTime: string) {
        const shownBlock = shown.find(o => o.id === key)
        const block = shownBlock && seriesOf(shownBlock)
        if (!shownBlock || !block) return

        const reason = whyNotMove(shownBlock, shownBlock.date)
        if (reason) {
            setError(reason)
            return
        }
        persist({ ...block, endTime: newEndTime }, block)
    }

    const column = (day: string) => (
        <DayColumn
            key={day}
            day={day}
            blocks={blocksOn(day)}
            pxPerMinute={pxPerMinute}
            isToday={day === today}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onResize={handleResize}
            onCreateDraft={handleCreateDraft}
        />
    )

    return (
        <div>
            {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}
            {dialogOpen && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="block-dialog-title"
                        className="bg-surface rounded-xl border border-line p-5 w-full max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto"
                    >
                        <h3 id="block-dialog-title" className="text-sm font-semibold text-ink mb-3">
                            {editing ? "Edit block" : "New block"}
                        </h3>
                        <BlockForm
                            day={editing ? editing.day : createDraft!.day}
                            block={editing?.block}
                            initialStartTime={createDraft?.startTime}
                            initialEndTime={createDraft?.endTime}
                            onCreated={handleSaved}
                            onUpdated={handleSaved}
                            onCancel={closeDialog}
                        />
                    </div>
                </div>
            )}

            <div className="flex justify-end mb-3">
                <div role="group" aria-label="Zoom" className="inline-flex gap-0.5 rounded-lg bg-sunken p-0.5">
                    {ZOOMS.map(z => (
                        <button
                            key={z.id}
                            type="button"
                            aria-pressed={zoom.id === z.id}
                            onClick={() => setZoom(z.id)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                zoom.id === z.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                            }`}
                        >
                            {z.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile day picker: the week's dates */}
            <div className="md:hidden flex gap-1 overflow-x-auto pb-2 mb-4">
                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        aria-pressed={activeDay === day}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            activeDay === day
                                ? "bg-primary-ink text-canvas"
                                : "bg-sunken text-ink-soft hover:bg-sunken-strong"
                        }`}
                    >
                        {formatDateOnly(day, "EEE d")}
                    </button>
                ))}
            </div>

            {/* Desktop day headers: weekday and date, today circled */}
            <div className="hidden md:flex mb-2">
                <div className="w-14 flex-shrink-0" />
                {days.map(day => (
                    <div key={day} className="flex-1 text-center text-xs font-semibold text-ink-muted uppercase tracking-wide">
                        {formatDateOnly(day, "EEE")}
                        <span
                            className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm normal-case tracking-normal tabular-nums ${
                                day === today ? "bg-primary-ink text-canvas" : "text-ink"
                            }`}
                        >
                            {formatDateOnly(day, "d")}
                        </span>
                    </div>
                ))}
            </div>

            {/* A fixed id: otherwise dnd-kit numbers its labels with a counter, and the server's count and the
                browser's differ, so React can't hydrate the page (DndDescribedBy-0 vs -1) */}
            <DndContext id="schedule-grid" sensors={sensors} onDragEnd={handleDragEnd}>
                <div ref={scrollRef} className="flex overflow-y-auto max-h-[70vh] border border-line rounded-xl">
                    <HourLabels pxPerMinute={pxPerMinute} />

                    {/* Mobile: one day */}
                    <div className="flex-1 md:hidden">{column(activeDay)}</div>

                    {/* Desktop: the whole week */}
                    <div className="hidden md:flex flex-1">{days.map(column)}</div>
                </div>
            </DndContext>

            {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
        </div>
    )
}
