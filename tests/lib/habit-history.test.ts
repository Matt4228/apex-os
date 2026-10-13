// tests/lib/habit-history.test.ts
import { HEATMAP_WEEKS, dayStreak, heatmapDays, heatmapStart, weekOf } from "@/lib/habitHistory"
import { toDateInputValue } from "@/lib/dates"
import { describe, expect, it } from "vitest"

// 2026-10-14 is a Wednesday; its week runs Sunday Oct 11 to Saturday Oct 17
const TODAY = "2026-10-14"

describe("heatmapStart", () => {
    it("starts on the Sunday eleven weeks before this week's", () => {
        expect(toDateInputValue(heatmapStart(TODAY))).toBe("2026-07-26")
    })
})

describe("heatmapDays", () => {
    it("covers twelve whole weeks, Sunday first", () => {
        const days = heatmapDays([], TODAY)

        expect(days).toHaveLength(HEATMAP_WEEKS * 7)
        expect(days[0]).toBe(false)
    })

    it("marks logged days, and leaves days after today empty", () => {
        const days = heatmapDays(["2026-07-26", "2026-10-13", "2026-10-14"], TODAY)
        const last = days.slice(-7) // this week, Sunday to Saturday

        expect(days[0]).toBe(true)
        expect(last).toEqual([false, false, true, true, null, null, null])
    })
})

describe("weekOf", () => {
    it("lists this week from Sunday, true where logged", () => {
        expect(weekOf(["2026-10-11", "2026-10-14", "2026-10-04"], TODAY)).toEqual([true, false, false, true, false, false, false])
    })
})

describe("dayStreak", () => {
    it("counts the days in a row up to today", () => {
        expect(dayStreak(["2026-10-12", "2026-10-13", "2026-10-14"], TODAY)).toBe(3)
    })

    it("still counts the run ending yesterday before today is logged", () => {
        expect(dayStreak(["2026-10-12", "2026-10-13"], TODAY)).toBe(2)
    })

    it("stops at the first missed day", () => {
        expect(dayStreak(["2026-10-10", "2026-10-12", "2026-10-13", "2026-10-14"], TODAY)).toBe(3)
    })

    it("is zero with nothing logged yesterday or today", () => {
        expect(dayStreak(["2026-10-11"], TODAY)).toBe(0)
        expect(dayStreak([], TODAY)).toBe(0)
    })
})
