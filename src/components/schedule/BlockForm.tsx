"use client"

import { useState } from "react"
import { createScheduleBlock, updateScheduleBlock, type Scope } from "@/app/actions/schedule"
import { Button } from "@/components/ui/button"
import { CategorySelect, useCategories } from "@/components/ui/category-select"
import { Input } from "@/components/ui/input"
import { parseDateOnly } from "@/lib/dates"
import type { Exception } from "@/lib/occurrences"
import { fieldsOf, toFormData } from "./blockFields"
import ScopeDialog from "./ScopeDialog"
import type { BlockFields, CalendarBlock, Series } from "./types"

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const selectClass =
    "w-full rounded-md border border-line px-2 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent"

/** What the server saved: the block and its changed days, plus a new series when "following" split it */
export type Saved = { block: Series; exceptions: Exception[]; created?: Saved }

/**
 * Create a block, or edit one when `block` is given. `day` is the day the form opened on ("YYYY-MM-DD"): a new
 * block's date. Editing a repeating block starts from that day as it shows (`shown`), and asks which days the change
 * is for before saving
 */
export default function BlockForm({
    day,
    block,
    shown,
    initialStartTime,
    initialEndTime,
    onCreated,
    onUpdated,
    onDelete,
    onCancel,
}: {
    day: string
    block?: Series
    /** The day of a repeating block the form was opened from */
    shown?: CalendarBlock
    initialStartTime?: string
    initialEndTime?: string
    onCreated?: (saved: Saved) => void
    onUpdated?: (saved: Saved) => void
    /** Shows a Delete button for a saved block */
    onDelete?: () => void
    onCancel: () => void
}) {
    const repeating = block !== undefined && block.repeat !== "none"
    const [fields, setFields] = useState<BlockFields>(() =>
        block
            ? {
                  ...fieldsOf(block),
                  // A day of a repeating block opens as that day shows, on its own date
                  ...(repeating && shown
                      ? { label: shown.label, category: shown.category ?? "", startTime: shown.startTime, endTime: shown.endTime, startDate: shown.date }
                      : {}),
              }
            : {
                  label: "",
                  category: "",
                  startDate: day,
                  startTime: initialStartTime ?? "09:00",
                  endTime: initialEndTime ?? "10:00",
                  repeat: "none",
                  repeatDays: [],
                  ends: "never",
                  endsOn: "",
                  endsAfter: "10",
              },
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [askingScope, setAskingScope] = useState(false)
    const { remember } = useCategories()

    const set = (change: Partial<BlockFields>) => setFields(current => ({ ...current, ...change }))
    const date = fields.startDate ? parseDateOnly(fields.startDate) : null
    const repeats = fields.repeat !== "none"

    // Weekly starts on the date's own weekday, so the first pick already means something
    function changeRepeat(repeat: string) {
        set({ repeat, repeatDays: repeat === "weekly" && fields.repeatDays.length === 0 && date ? [date.getUTCDay()] : fields.repeatDays })
    }

    function toggleDay(weekday: number) {
        set({
            repeatDays: fields.repeatDays.includes(weekday)
                ? fields.repeatDays.filter(d => d !== weekday)
                : [...fields.repeatDays, weekday].sort(),
        })
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (repeating && shown) setAskingScope(true)
        else save()
    }

    /** Saves the form; for a repeating block, for the days `scope` says, counted from the day it opened on */
    async function save(scope?: Scope) {
        setAskingScope(false)
        setLoading(true)
        setError(null)

        const formData = toFormData(fields)
        const target = scope && shown ? { date: shown.originalDate, scope } : undefined
        const result = block ? await updateScheduleBlock(block.id, formData, target) : await createScheduleBlock(formData)
        setLoading(false)

        if (!result || "error" in result) {
            setError(result?.error ?? "Something went wrong")
            return
        }
        remember(fields.category)
        if (block) onUpdated?.(result as Saved)
        else onCreated?.(result as Saved)
    }

    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1">
                <span className="text-xs text-ink-muted">Label</span>
                <Input
                    name="label"
                    placeholder="Deep work, Dentist..."
                    value={fields.label}
                    onChange={e => set({ label: e.target.value })}
                    required
                    autoFocus
                />
            </label>

            <label className="block space-y-1">
                <span className="text-xs text-ink-muted">{repeats && !block ? "Starts" : "Date"}</span>
                <Input type="date" value={fields.startDate} onChange={e => set({ startDate: e.target.value })} required />
            </label>

            <div className="flex gap-3">
                <label className="flex-1 space-y-1">
                    <span className="text-xs text-ink-muted">Start</span>
                    <Input type="time" value={fields.startTime} onChange={e => set({ startTime: e.target.value })} required />
                </label>
                <label className="flex-1 space-y-1">
                    <span className="text-xs text-ink-muted">End</span>
                    <Input type="time" value={fields.endTime} onChange={e => set({ endTime: e.target.value })} required />
                </label>
            </div>

            {/* The block's color comes from its category */}
            <div className="space-y-1">
                <span className="text-xs text-ink-muted">Category</span>
                <CategorySelect defaultValue={fields.category || null} onChange={category => set({ category })} />
            </div>

            <label className="block space-y-1">
                <span className="text-xs text-ink-muted">Repeat</span>
                <select value={fields.repeat} onChange={e => changeRepeat(e.target.value)} className={`${selectClass} h-10`}>
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekday">Every weekday (Mon to Fri)</option>
                    <option value="weekly">Weekly on chosen days</option>
                    <option value="monthly">Monthly on day {date ? date.getUTCDate() : "..."}</option>
                </select>
            </label>

            {fields.repeat === "weekly" && (
                <fieldset className="space-y-1">
                    <legend className="text-xs text-ink-muted">On</legend>
                    <div className="flex gap-1.5 flex-wrap">
                        {WEEKDAY_NAMES.map((name, weekday) => (
                            <button
                                key={name}
                                type="button"
                                aria-label={name}
                                aria-pressed={fields.repeatDays.includes(weekday)}
                                onClick={() => toggleDay(weekday)}
                                className={`h-9 w-9 rounded-full border text-xs font-medium transition-colors ${
                                    fields.repeatDays.includes(weekday)
                                        ? "bg-accent-ink border-accent-ink text-surface"
                                        : "border-line text-ink-soft hover:border-line-strong"
                                }`}
                            >
                                {name[0]}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            {repeats && (
                <fieldset className="space-y-2">
                    <legend className="text-xs text-ink-muted">Ends</legend>
                    <label className="flex items-center gap-2 text-sm text-ink-soft">
                        <input type="radio" name="ends" checked={fields.ends === "never"} onChange={() => set({ ends: "never" })} />
                        Never
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink-soft">
                        <input type="radio" name="ends" checked={fields.ends === "on"} onChange={() => set({ ends: "on" })} />
                        On
                        <Input
                            type="date"
                            aria-label="End date"
                            value={fields.endsOn}
                            onChange={e => set({ ends: "on", endsOn: e.target.value })}
                            className="h-8 w-auto"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink-soft">
                        <input type="radio" name="ends" checked={fields.ends === "after"} onChange={() => set({ ends: "after" })} />
                        After
                        <Input
                            type="number"
                            min={1}
                            aria-label="Number of times"
                            value={fields.endsAfter}
                            onChange={e => set({ ends: "after", endsAfter: e.target.value })}
                            className="h-8 w-20"
                        />
                        times
                    </label>
                </fieldset>
            )}


            {error && <p role="alert" className="text-xs text-danger-ink">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                    {loading ? "Saving..." : block ? "Update" : "Add block"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                {block && onDelete && (
                    <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="ml-auto text-danger-ink hover:text-danger-ink">
                        Delete
                    </Button>
                )}
            </div>
        </form>

        {/* Outside the form: the question has a form of its own, and forms can't nest */}
        {askingScope && shown && (
            <ScopeDialog action="change" date={shown.date} onChoose={save} onCancel={() => setAskingScope(false)} />
        )}
        </>
    )
}
