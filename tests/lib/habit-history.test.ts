// tests/lib/habit-history.test.ts
import { HEATMAP_WEEKS, bestDayStreak, bestWeekStreak, dayStreak, heatmapDays, heatmapStart, monthLabels, weekOf, weekStreak } from "@/lib/habitHistory"
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

describe("weekStreak", () => {
    // Weeks run Sunday to Saturday: Sep 20, Sep 27, Oct 4, and this week from Oct 11
    const earlier = ["2026-09-23", "2026-09-28", "2026-09-30", "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-08"]

    it("counts the weeks in a row that hit the target, not breaking on a week still under way", () => {
        expect(weekStreak([...earlier, "2026-10-12", "2026-10-13"], TODAY, 3)).toBe(2)
    })

    it("counts this week once it hits the target", () => {
        expect(weekStreak([...earlier, "2026-10-11", "2026-10-12", "2026-10-13"], TODAY, 3)).toBe(3)
    })

    it("is zero when last week fell short", () => {
        expect(weekStreak(["2026-09-28", "2026-09-30", "2026-10-02", "2026-10-05"], TODAY, 3)).toBe(0)
    })
})

describe("bestDayStreak", () => {
    it("finds the longest run of days ever, wherever it was", () => {
        expect(bestDayStreak(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-10", "2026-10-13", "2026-10-14"])).toBe(3)
    })

    it("is zero with no logs", () => {
        expect(bestDayStreak([])).toBe(0)
    })
})

describe("bestWeekStreak", () => {
    it("finds the longest run of weeks that hit the target", () => {
        // Weeks of Aug 30 and Sep 6 hit 2, Sep 13 has 1, Sep 20 hits 2
        const days = ["2026-08-31", "2026-09-01", "2026-09-07", "2026-09-08", "2026-09-14", "2026-09-21", "2026-09-22"]
        expect(bestWeekStreak(days, 2)).toBe(2)
    })
})

describe("monthLabels", () => {
    it("labels the first week of each month, dropping a label the next one would crowd", () => {
        // Weeks start Jul 26, Aug 2... so Jul has only its first column, right before Aug
        expect(monthLabels(TODAY)).toEqual([{ col: 1, label: "Aug" }, { col: 6, label: "Sep" }, { col: 10, label: "Oct" }])
    })

    it("keeps the first month when it has room", () => {
        expect(monthLabels("2026-10-25")).toEqual([{ col: 0, label: "Aug" }, { col: 4, label: "Sep" }, { col: 8, label: "Oct" }])
    })
})
