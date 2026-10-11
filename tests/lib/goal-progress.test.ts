// tests/lib/goal-progress.test.ts
import { goalProgress, sortSteps } from "@/lib/goalProgress"
import { describe, expect, it } from "vitest"

const step = (id: string, status: string, dueDate: string | null, createdAt: string) => ({
    id,
    title: `Step ${id}`,
    status,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdAt: new Date(createdAt),
})

const entry = (value: number, loggedOn: string) => ({ value, loggedOn: new Date(loggedOn) })

describe("sortSteps", () => {
    it("puts the earliest due date first", () => {
        const sorted = sortSteps([
            step("late", "todo", "2026-11-01", "2026-10-01"),
            step("soon", "todo", "2026-10-15", "2026-10-02"),
        ])
        expect(sorted.map(s => s.id)).toEqual(["soon", "late"])
    })

    it("puts undated steps after dated ones, oldest first", () => {
        const sorted = sortSteps([
            step("undated-new", "todo", null, "2026-10-03"),
            step("dated", "todo", "2026-12-01", "2026-10-02"),
            step("undated-old", "todo", null, "2026-10-01"),
        ])
        expect(sorted.map(s => s.id)).toEqual(["dated", "undated-old", "undated-new"])
    })

    it("does not change the array it was given", () => {
        const steps = [step("b", "todo", "2026-11-01", "2026-10-01"), step("a", "todo", "2026-10-01", "2026-10-01")]
        sortSteps(steps)
        expect(steps.map(s => s.id)).toEqual(["b", "a"])
    })
})

describe("goalProgress", () => {
    it("counts finished steps when the goal has steps", () => {
        const progress = goalProgress({
            targetValue: null,
            entries: [],
            tasks: [
                step("1", "done", null, "2026-10-01"),
                step("2", "done", null, "2026-10-02"),
                step("3", "todo", null, "2026-10-03"),
            ],
        })
        expect(progress).toMatchObject({ kind: "steps", done: 2, total: 3, percent: 67 })
    })

    it("picks the earliest-due unfinished step as next, skipping finished ones", () => {
        const progress = goalProgress({
            targetValue: null,
            entries: [],
            tasks: [
                step("done-earliest", "done", "2026-10-10", "2026-10-01"),
                step("later", "todo", "2026-10-30", "2026-10-01"),
                step("next", "todo", "2026-10-20", "2026-10-01"),
            ],
        })
        expect(progress.kind === "steps" && progress.nextStep?.id).toBe("next")
    })

    it("has no next step and 100% when every step is done", () => {
        const progress = goalProgress({
            targetValue: null,
            entries: [],
            tasks: [step("1", "done", null, "2026-10-01")],
        })
        expect(progress).toEqual({ kind: "steps", done: 1, total: 1, percent: 100, nextStep: null })
    })

    it("uses steps even when the goal also has numeric entries", () => {
        const progress = goalProgress({
            targetValue: 10,
            entries: [entry(9, "2026-10-01")],
            tasks: [step("1", "todo", null, "2026-10-01")],
        })
        expect(progress.kind).toBe("steps")
    })

    it("uses the newest entry for numeric progress whatever order they arrive in", () => {
        const progress = goalProgress({
            targetValue: 20,
            entries: [entry(5, "2026-10-05"), entry(2, "2026-10-01")],
            tasks: [],
        })
        expect(progress).toEqual({ kind: "numeric", percent: 25, value: 5, loggedOn: new Date("2026-10-05") })
    })

    it("caps numeric progress at 100 and floors it at 0", () => {
        expect(goalProgress({ targetValue: 10, entries: [entry(15, "2026-10-01")], tasks: [] }))
            .toMatchObject({ kind: "numeric", percent: 100 })
        expect(goalProgress({ targetValue: 10, entries: [entry(-3, "2026-10-01")], tasks: [] }))
            .toMatchObject({ kind: "numeric", percent: 0 })
    })

    it("has no progress without steps, a target, or any entries", () => {
        expect(goalProgress({ targetValue: null, entries: [], tasks: [] })).toEqual({ kind: "none" })
        expect(goalProgress({ targetValue: 10, entries: [], tasks: [] })).toEqual({ kind: "none" })
        expect(goalProgress({ targetValue: null, entries: [entry(3, "2026-10-01")], tasks: [] })).toEqual({ kind:
"none" })
    })

    it("treats a target of 0 as no target instead of dividing by zero", () => {
        expect(goalProgress({ targetValue: 0, entries: [entry(3, "2026-10-01")], tasks: [] })).toEqual({ kind: "none"
})
    })
})