import { countCompletedWeeks, countGoalStatuses, countTaskStatuses, sortTasksByPriority } from "@/lib/dashboardStats"
import { describe, expect, it } from "vitest"

describe("countTaskStatuses", () => {
    it("counts todo and done tasks using the real status values", () => {
        const tasks = [{ status: "todo" }, { status: "todo" }, { status: "done" }]

        expect(countTaskStatuses(tasks)).toEqual({ todoCount: 2, doneCount: 1 })
    })

    it("returns zero for a status value that never occurs", () => {
        expect(countTaskStatuses([{ status: "todo" }])).toEqual({ todoCount: 1, doneCount: 0 })
    })
})

describe("countGoalStatuses", () => {
    it("counts active aand complete goals using the real status values", () => {
        const goals = [{ status: "active" }, { status: "complete" }, { status: "complete" }]

        expect(countGoalStatuses(goals)).toEqual({ todoCount: 1, doneCount: 2 })
    })
})

describe("sortTasksByPriority", () => {
    const task = (id: string, priority: string, dueDate: string | null, createdAt: string) => ({
        id,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdAt: new Date(createdAt)
    })

    it("puts high priority first, even though 'high' sorts last alphabetically", () => {
        const sorted = sortTasksByPriority([
            task("low", "low", null, "2026-10-01"),
            task("high", "high", null, "2026-10-01"),
            task("medium", "medium", null, "2026-10-01"),
        ])
        expect(sorted.map(t => t.id)).toEqual(["high", "medium", "low"])
    })

    it("breaks ties by soonest due date, with no due date last", () => {
        const sorted = sortTasksByPriority([
            task("none", "high", null, "2026-10-01"),
            task("later", "high", "2026-10-20", "2026-10-01"),
            task("sooner", "high", "2026-10-12", "2026-10-01"),
        ])
        expect(sorted.map(t => t.id)).toEqual(["sooner", "later", "none"])
    })

    it("breaks remaining ties by newest first", () => {
        const sorted = sortTasksByPriority([
            task("older", "medium", null, "2026-10-01"),
            task("newer", "medium", null, "2026-10-05"),
        ])
        expect(sorted.map(t => t.id)).toEqual(["newer", "older"])
    })
})

describe("countCompletedWeeks", () => {
    it("counts a week once even when several metrics were logged for it", () => {
        const entries = [
            { weekNumber: 1, weekComplete: true },
            { weekNumber: 1, weekComplete: true },
            { weekNumber: 2, weekComplete: false },
            { weekNumber: 3, weekComplete: true },
        ]
        expect(countCompletedWeeks(entries)).toBe(2)
    })
})