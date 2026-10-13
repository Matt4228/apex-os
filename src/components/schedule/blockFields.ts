import type { Scope } from "@/app/actions/schedule"
import { toDateInputValue } from "@/lib/dates"
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
 * Which days a drag or resize of a repeating block can change. Moving to another day only makes sense for that one
 * day ("every Monday from now on, moved to Tuesday" has no clear meaning), so it only offers "This block"
 */
export function scopesFor(block: CalendarBlock, toDay: string): Scope[] {
    return toDay === block.date ? ["this", "following", "all"] : ["this"]
}
