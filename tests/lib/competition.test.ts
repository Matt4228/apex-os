// tests/lib/competition.test.ts
import {
    daysLeft,
    lastDay,
    monthGroups,
    quickAmounts,
    rampTargets,
    rank,
    season,
    streak,
    sundayOf,
    weekDates,
    weekOf,
    weekProgress,
    type Log,
} from "@/lib/competition"
import { parseDateOnly } from "@/lib/dates"
import { describe, expect, it } from "vitest"

// Starts Sunday Oct 4, 2026; 3 weeks, ending Saturday Oct 24
const run = { startDate: "2026-10-04", weeks: 3 }
const km = { id: "km", name: "km run", unit: "km" }
const wo = { id: "wo", name: "Workouts", unit: null }
const targets = [
    { metricId: "km", week: 1, target: 10 }, { metricId: "km", week: 2, target: 12 }, { metricId: "km", week: 3, target: 15 },
    { metricId: "wo", week: 1, target: 2 }, { metricId: "wo", week: 2, target: 3 }, { metricId: "wo", week: 3, target: 3 },
]
const log = (metricId: string, week: number, amount: number): Log => ({ metricId, week, amount })

describe("weeks", () => {
    it("snaps any day to its week's Sunday", () => {
        expect(sundayOf("2026-10-07")).toBe("2026-10-04")
        expect(sundayOf("2026-10-04")).toBe("2026-10-04")
    })

    it("places a day before, inside or after the competition", () => {
        expect(weekOf(run, "2026-10-03")).toEqual({ state: "upcoming" })
        expect(weekOf(run, "2026-10-04")).toEqual({ state: "active", week: 1 })
        expect(weekOf(run, "2026-10-10")).toEqual({ state: "active", week: 1 })
        expect(weekOf(run, "2026-10-11")).toEqual({ state: "active", week: 2 })
        expect(weekOf(run, "2026-10-24")).toEqual({ state: "active", week: 3 })
        expect(weekOf(run, "2026-10-25")).toEqual({ state: "finished" })
    })

    it("reads a start date from Prisma too", () => {
        expect(weekOf({ startDate: parseDateOnly("2026-10-04"), weeks: 3 }, "2026-10-12")).toEqual({ state: "active", week: 2 })
    })

    it("gives each week's Sunday and Saturday, and the last day", () => {
        expect(weekDates(run, 2)).toEqual({ from: "2026-10-11", to: "2026-10-17" })
        expect(lastDay(run)).toBe("2026-10-24")
    })
})

describe("weekProgress", () => {
    it("adds up each metric's logs for that week only", () => {
        const progress = weekProgress([km], targets, [log("km", 1, 4), log("km", 1, 3.5), log("km", 2, 9)], 1)

        expect(progress.metrics).toEqual([{ metricId: "km", total: 7.5, target: 10, percent: 75 }])
        expect(progress.complete).toBe(false)
    })

    it("goes past 100% and counts as complete", () => {
        const progress = weekProgress([km], targets, [log("km", 1, 13)], 1)

        expect(progress.percent).toBe(130)
        expect(progress.complete).toBe(true)
    })

    it("averages several metrics, and completes only when every one is met", () => {
        const progress = weekProgress([km, wo], targets, [log("km", 1, 15), log("wo", 1, 1)], 1)

        expect(progress.percent).toBe(100) // (150% + 50%) / 2
        expect(progress.complete).toBe(false)
    })

    it("isn't complete with no metrics or no target", () => {
        expect(weekProgress([], targets, [], 1).complete).toBe(false)
        expect(weekProgress([km], [], [log("km", 1, 5)], 1)).toMatchObject({ percent: 0, complete: false })
    })
})

describe("season", () => {
    const logs = [log("km", 1, 10), log("wo", 1, 2), log("km", 2, 6), log("wo", 2, 3), log("km", 3, 20), log("wo", 3, 3)]

    it("marks past weeks complete or missed, this week current, and later weeks ahead", () => {
        const s = season([km, wo], targets, logs.slice(0, 4), run, { state: "active", week: 2 })

        expect(s.weeks).toEqual(["complete", "current", "ahead"])
        expect(s.completedWeeks).toBe(1)
    })

    it("turns this week complete as soon as it is", () => {
        expect(season([km, wo], targets, logs, run, { state: "active", week: 3 }).weeks).toEqual(["complete", "missed", "complete"])
    })

    it("adds up every week so far, uncapped", () => {
        // Week 1: 100%; week 2: (50% + 100%) / 2 = 75%; week 3: (133.3% + 100%) / 2 = 116.7%
        expect(season([km, wo], targets, logs, run, { state: "finished" }).totalProgress).toBeCloseTo(291.67, 1)
    })

    it("has nothing yet before it starts", () => {
        expect(season([km, wo], targets, logs, run, { state: "upcoming" })).toEqual({ completedWeeks: 0, totalProgress: 0, weeks: ["ahead", "ahead", "ahead"] })
    })
})

describe("rank", () => {
    it("ranks by completed weeks, then total progress", () => {
        const ranked = rank([
            { id: "you", completedWeeks: 2, totalProgress: 250 },
            { id: "alex", completedWeeks: 3, totalProgress: 240 },
            { id: "sam", completedWeeks: 2, totalProgress: 260 },
        ])

        expect(ranked.map(r => `${r.place} ${r.id}`)).toEqual(["1 alex", "2 sam", "3 you"])
    })

    it("lets equals share a place", () => {
        const ranked = rank([
            { id: "a", completedWeeks: 2, totalProgress: 200 },
            { id: "b", completedWeeks: 2, totalProgress: 200 },
            { id: "c", completedWeeks: 1, totalProgress: 300 },
        ])

        expect(ranked.map(r => r.place)).toEqual([1, 1, 3])
    })
})

describe("streak", () => {
    it("counts completed weeks in a row up to the latest finished week", () => {
        expect(streak(["complete", "missed", "complete", "complete", "current", "ahead"])).toBe(2)
    })

    it("doesn't let this week break it while it runs, and counts it once complete", () => {
        expect(streak(["complete", "complete", "current"])).toBe(2)
        expect(streak(["complete", "complete", "complete", "ahead"])).toBe(3)
    })

    it("is zero right after a miss", () => {
        expect(streak(["complete", "missed", "current"])).toBe(0)
        expect(streak(["ahead", "ahead"])).toBe(0)
    })
})

describe("rampTargets", () => {
    it("climbs steadily from the first week to the last, rounded", () => {
        expect(rampTargets(15, 40, 6)).toEqual([15, 20, 25, 30, 35, 40])
        expect(rampTargets(10, 12, 5, 0.5)).toEqual([10, 10.5, 11, 11.5, 12])
        expect(rampTargets(15, 40, 52).slice(0, 3)).toEqual([15, 15, 16])
    })

    it("can come down, and gives one week the first target", () => {
        expect(rampTargets(30, 10, 3, 5)).toEqual([30, 20, 10])
        expect(rampTargets(15, 40, 1)).toEqual([15])
    })
})

describe("quickAmounts", () => {
    it("offers 1 for small targets like workouts", () => {
        expect(quickAmounts(4)).toEqual([1])
    })

    it("offers round amounts near a tenth, a quarter and a half of the target", () => {
        expect(quickAmounts(22)).toEqual([2, 5, 10])
        expect(quickAmounts(150)).toEqual([20, 50, 100])
    })
})

describe("monthGroups", () => {
    it("groups weeks by the month they start in", () => {
        // Sundays: Sep 27, Oct 4, 11, 18, 25, Nov 1
        expect(monthGroups({ startDate: "2026-09-27", weeks: 6 })).toEqual([
            { month: "2026-09", weeks: [1] },
            { month: "2026-10", weeks: [2, 3, 4, 5] },
            { month: "2026-11", weeks: [6] },
        ])
    })

    it("covers three years in 36 or 37 months", () => {
        const groups = monthGroups({ startDate: "2026-01-04", weeks: 156 })
        expect(groups.flatMap(g => g.weeks)).toHaveLength(156)
        expect(groups.length).toBeGreaterThanOrEqual(35)
    })
})

describe("daysLeft", () => {
    it("counts today through the week's Saturday", () => {
        expect(daysLeft(run, 2, "2026-10-11")).toBe(7)
        expect(daysLeft(run, 2, "2026-10-14")).toBe(4)
        expect(daysLeft(run, 2, "2026-10-17")).toBe(1)
    })
})
