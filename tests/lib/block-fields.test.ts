// tests/lib/block-fields.test.ts
import { fieldsOf, scopesFor, toFormData } from "@/components/schedule/blockFields"
import type { CalendarBlock } from "@/components/schedule/types"
import { parseDateOnly } from "@/lib/dates"
import { describe, expect, it } from "vitest"

const series = {
    id: "b1",
    label: "Course",
    category: null,
    startTime: "19:00",
    endTime: "20:30",
    startDate: parseDateOnly("2026-09-29"),
    repeat: "weekly",
    repeatDays: [2, 4],
    endsOn: null,
    endsAfter: 6,
}

const shown = (o: Partial<CalendarBlock> = {}): CalendarBlock => ({
    id: "b1|2026-10-13",
    blockId: "b1",
    date: "2026-10-13",
    originalDate: "2026-10-13",
    startTime: "19:00",
    endTime: "20:30",
    label: "Course",
    category: null,
    repeats: true,
    changed: false,
    ...o,
})

describe("fieldsOf and toFormData", () => {
    it("round-trips a saved block into the form fields the actions read", () => {
        const formData = toFormData(fieldsOf(series))

        expect(Object.fromEntries(formData)).toEqual({
            label: "Course",
            category: "",
            startDate: "2026-09-29",
            startTime: "19:00",
            endTime: "20:30",
            repeat: "weekly",
            repeatDays: "2,4",
            ends: "after",
            endsOn: "",
            endsAfter: "6",
        })
    })

    it("reads an end date as 'on'", () => {
        expect(fieldsOf({ ...series, endsAfter: null, endsOn: parseDateOnly("2026-12-31") })).toMatchObject({ ends: "on", endsOn: "2026-12-31" })
    })
})

describe("scopesFor", () => {
    it("offers all three when a repeating block moves to another time on its own day", () => {
        expect(scopesFor(shown(), "2026-10-13")).toEqual(["this", "following", "all"])
    })

    it("offers only this block when it moves to another day", () => {
        expect(scopesFor(shown(), "2026-10-14")).toEqual(["this"])
    })
})
