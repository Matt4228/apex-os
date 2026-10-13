import type { Occurrence } from "@/lib/occurrences"

/** A block as the database stores it: one day, or a series that repeats */
export type Series = {
    id: string
    label: string
    category: string | null
    startTime: string
    endTime: string
    startDate: Date
    repeat: string
    repeatDays: number[]
    endsOn: Date | null
    endsAfter: number | null
}

/** One block on one day of the grid. `id` is "blockId|originalDate": unique across the week, for keys and dragging */
export type CalendarBlock = Occurrence & { id: string }

/** The block form's fields, as text, the way they go to the server actions */
export type BlockFields = {
    label: string
    category: string
    startDate: string
    startTime: string
    endTime: string
    repeat: string
    repeatDays: number[]
    ends: "never" | "on" | "after"
    endsOn: string
    endsAfter: string
}
