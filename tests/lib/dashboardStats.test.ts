import { countGoalStatuses, countTaskStatuses } from "@/lib/dashboardStats"
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