import { formatDateOnly, toDateInputValue } from "@/lib/dates"
import type { BlockFields, CalendarBlock, Series } from "./types"

/** A saved block's fields, ready for the form or for saving again after a drag */
export function fieldsOf(block: Series): BlockFields {
    return {
        label: block.label,
        category: block.category ?? "",
        startDate: toDateInputValue(block.startDate),
        startTime: block.startTime,
        endTime: block.endTime,
        repeat: block.repeat,
        repeatDays: block.repeatDays,
        ends: block.endsOn ? "on" : block.endsAfter ? "after" : "never",
        endsOn: block.endsOn ? toDateInputValue(block.endsOn) : "",
        endsAfter: block.endsAfter ? String(block.endsAfter) : "",
    }
}

/** The fields as FormData for createScheduleBlock and updateScheduleBlock */
export function toFormData(fields: BlockFields): FormData {
    const formData = new FormData()
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, Array.isArray(value) ? value.join(",") : value)
    }
    return formData
}

/**
 * Why a drag or resize can't be saved, or null when it can. Dragging changes the whole block: a repeating block can
 * move to other times but not to other days (its days are part of its repeat rule), and a day changed on its own
 * keeps its own times
 */
export function whyNotMove(block: CalendarBlock, toDay: string): string | null {
    if (block.changed) return `${formatDateOnly(block.date, "EEEE")}'s "${block.label}" has its own times, so it can't be dragged.`
    if (block.repeats && toDay !== block.date) return `"${block.label}" repeats. Open it to change the days it happens on.`
    return null
}
