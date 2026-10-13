// tests/lib/day-strip.test.ts
import { stripLayout } from "@/lib/dayStrip"
import { describe, expect, it } from "vitest"

describe("stripLayout", () => {
    it("runs the lane from the first start hour to the last end hour", () => {
        const layout = stripLayout([
            { id: "lunch", startTime: "12:00", endTime: "13:00" },
            { id: "run", startTime: "06:30", endTime: "07:00" },
            { id: "job", startTime: "17:00", endTime: "17:45" },
        ])

        expect(layout?.start).toBe(6 * 60)
        expect(layout?.end).toBe(18 * 60)
    })

    it("places each block as a share of the lane", () => {
        const layout = stripLayout([
            { id: "a", startTime: "08:00", endTime: "10:00" },
            { id: "b", startTime: "10:00", endTime: "12:00" },
        ])

        expect(layout?.bars).toEqual([
            { id: "a", left: 0, width: 50 },
            { id: "b", left: 50, width: 50 },
        ])
    })

    it("marks both ends and every third hour between them", () => {
        const layout = stripLayout([{ id: "a", startTime: "07:00", endTime: "17:00" }])

        expect(layout?.ticks.map(t => t / 60)).toEqual([7, 9, 12, 15, 17])
    })

    it("skips blocks that end before they start, and draws nothing when none are left", () => {
        expect(stripLayout([])).toBeNull()
        expect(stripLayout([{ id: "bad", startTime: "10:00", endTime: "09:00" }])).toBeNull()
    })
})
