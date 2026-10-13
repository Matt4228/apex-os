// tests/lib/occurrences.test.ts
import { occurrences, occursOn, seriesDays, weekDates, type Exception, type SeriesBlock } from "@/lib/occurrences"
import { describe, expect, it } from "vitest"

// 2026-10-11 is a Sunday; its week runs to Saturday 2026-10-17
const block = (o: Partial<SeriesBlock> = {}): SeriesBlock => ({
    id: "b1",
    label: "Deep work",
    category: "Work",
    startTime: "09:00",
    endTime: "12:00",
    startDate: "2026-10-12",
    repeat: "none",
    repeatDays: [],
    endsOn: null,
    endsAfter: null,
    ...o,
})

const exception = (o: Partial<Exception> & { date: string }): Exception => ({
    blockId: "b1",
    cancelled: false,
    newDate: null,
    startTime: null,
    endTime: null,
    label: null,
    category: null,
    ...o,
})

const datesOf = (blocks: SeriesBlock[], exceptions: Exception[] = [], from = "2026-10-11", to = "2026-10-17") =>
    occurrences(blocks, exceptions, from, to).map(o => o.date)

describe("seriesDays: the days a series happens on", () => {
    it("gives a one-off block its single day", () => {
        expect(seriesDays(block(), "2026-12-31")).toEqual(["2026-10-12"])
    })

    it("repeats daily", () => {
        expect(seriesDays(block({ repeat: "daily" }), "2026-10-15")).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"])
    })

    it("repeats on weekdays only", () => {
        expect(seriesDays(block({ repeat: "weekday", startDate: "2026-10-15" }), "2026-10-20")).toEqual([
            "2026-10-15", "2026-10-16", "2026-10-19", "2026-10-20",
        ])
    })

    it("repeats weekly on each chosen day", () => {
        expect(seriesDays(block({ repeat: "weekly", repeatDays: [1, 3] }), "2026-10-21")).toEqual([
            "2026-10-12", "2026-10-14", "2026-10-19", "2026-10-21",
        ])
    })

    it("skips the start date when it isn't one of the chosen days", () => {
        expect(seriesDays(block({ repeat: "weekly", repeatDays: [3], startDate: "2026-10-12" }), "2026-10-20")).toEqual(["2026-10-14"])
    })

    it("repeats monthly on the start date's day, skipping months without it", () => {
        expect(seriesDays(block({ repeat: "monthly", startDate: "2026-01-31" }), "2026-06-30")).toEqual([
            "2026-01-31", "2026-03-31", "2026-05-31",
        ])
    })

    it("stops after its end date, which is included", () => {
        expect(seriesDays(block({ repeat: "daily", endsOn: "2026-10-13" }), "2026-12-31")).toEqual(["2026-10-12", "2026-10-13"])
    })

    it("stops after a number of times", () => {
        expect(seriesDays(block({ repeat: "weekly", repeatDays: [2, 4], startDate: "2026-10-13", endsAfter: 3 }), "2026-12-31")).toEqual([
            "2026-10-13", "2026-10-15", "2026-10-20",
        ])
    })

    it("gives nothing before the start date", () => {
        expect(seriesDays(block({ repeat: "daily", startDate: "2026-11-01" }), "2026-10-31")).toEqual([])
    })
})

describe("occurrences", () => {
    it("lists a series' days inside the range, with the block's details", () => {
        const [first] = occurrences([block({ repeat: "weekday" })], [], "2026-10-11", "2026-10-17")

        expect(datesOf([block({ repeat: "weekday" })])).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"])
        expect(first).toEqual({
            blockId: "b1",
            date: "2026-10-12",
            originalDate: "2026-10-12",
            startTime: "09:00",
            endTime: "12:00",
            label: "Deep work",
            category: "Work",
            repeats: true,
            changed: false,
        })
    })

    it("includes a series that started long before the range", () => {
        expect(datesOf([block({ repeat: "weekly", repeatDays: [0], startDate: "2024-01-07" })])).toEqual(["2026-10-11"])
    })

    it("drops a cancelled day", () => {
        expect(datesOf([block({ repeat: "weekday" })], [exception({ date: "2026-10-14", cancelled: true })])).not.toContain("2026-10-14")
    })

    it("still counts a cancelled day toward 'after N times'", () => {
        const course = block({ repeat: "daily", endsAfter: 3 })

        expect(datesOf([course], [exception({ date: "2026-10-13", cancelled: true })])).toEqual(["2026-10-12", "2026-10-14"])
    })

    it("uses a changed day's own times and name, and marks it changed", () => {
        const [lunch] = occurrences(
            [block({ label: "Lunch", startTime: "12:00", endTime: "13:00" })],
            [exception({ date: "2026-10-12", startTime: "12:30", endTime: "13:30", label: "Long lunch" })],
            "2026-10-12",
            "2026-10-12",
        )

        expect(lunch).toMatchObject({ startTime: "12:30", endTime: "13:30", label: "Long lunch", category: "Work", changed: true })
    })

    it("shows a moved day on its new date, even when it moved in from outside the range", () => {
        const moved = [exception({ date: "2026-10-19", newDate: "2026-10-16" })]

        const [occurrence] = occurrences([block({ repeat: "weekday" })], moved, "2026-10-16", "2026-10-16").filter(o => o.changed)
        expect(occurrence).toMatchObject({ date: "2026-10-16", originalDate: "2026-10-19" })
    })

    it("hides a day moved out of the range", () => {
        expect(datesOf([block({ repeat: "weekday" })], [exception({ date: "2026-10-16", newDate: "2026-10-20" })])).not.toContain("2026-10-16")
    })

    it("ignores another block's exceptions", () => {
        expect(datesOf([block({ repeat: "weekday" })], [exception({ blockId: "other", date: "2026-10-14", cancelled: true })])).toContain("2026-10-14")
    })

    it("sorts by day, then start time", () => {
        const morning = block({ id: "a", startTime: "06:00", endTime: "07:00", repeat: "daily", startDate: "2026-10-11" })
        const later = block({ id: "b", startTime: "05:00", endTime: "05:30", startDate: "2026-10-12" })

        const list = occurrences([morning, later], [], "2026-10-11", "2026-10-12")
        expect(list.map(o => `${o.date} ${o.blockId}`)).toEqual(["2026-10-11 a", "2026-10-12 b", "2026-10-12 a"])
    })

    it("takes dates as Date objects too, the way Prisma returns them", () => {
        const fromPrisma = block({ startDate: new Date("2026-10-12T00:00:00Z"), repeat: "daily", endsOn: new Date("2026-10-13T00:00:00Z") })

        expect(datesOf([fromPrisma])).toEqual(["2026-10-12", "2026-10-13"])
    })
})

describe("occursOn", () => {
    it("finds the block on a day it happens, and nothing on other days", () => {
        const weekday = block({ repeat: "weekday" })

        expect(occursOn(weekday, [], "2026-10-13")?.startTime).toBe("09:00")
        expect(occursOn(weekday, [], "2026-10-17")).toBeNull()
        expect(occursOn(weekday, [exception({ date: "2026-10-13", cancelled: true })], "2026-10-13")).toBeNull()
    })
})

describe("weekDates", () => {
    it("lists Sunday to Saturday around a day", () => {
        expect(weekDates("2026-10-14")).toEqual([
            "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17",
        ])
    })
})
