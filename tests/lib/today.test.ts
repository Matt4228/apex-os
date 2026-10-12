// tests/lib/today.test.ts
import { buildToday, dueLabel, groupPlan } from "@/lib/today"
import { parseDateOnly } from "@/lib/dates"
import { describe, expect, it } from "vitest"

const TODAY = "2026-10-11"

type Options = { status?: string; priority?: string; dueDate?: string; plannedFor?: string; createdAt?: string }

const task = (id: string, o: Options = {}) => ({
    id,
    title: `Task ${id}`,
    status: o.status ?? "todo",
    priority: o.priority ?? "medium",
    dueDate: o.dueDate ? parseDateOnly(o.dueDate) : null,
    plannedFor: o.plannedFor ? parseDateOnly(o.plannedFor) : null,
    createdAt: new Date(o.createdAt ?? "2026-10-01"),
})

type T = ReturnType<typeof task>

const goal = (id: string, tasks: T[], status = "active") => ({
    id,
    title: `Goal ${id}`,
    status,
    targetValue: null,
    entries: [],
    tasks,
})

const ids = (list: { id: string }[]) => list.map(t => t.id)

describe("buildToday", () => {
    it("puts tasks planned for today in the plan, open ones before done ones", () => {
        const today = buildToday({
            tasks: [task("done", { status: "done", plannedFor: TODAY }), task("open", { plannedFor: TODAY })],
            goals: [],
            today: TODAY,
        })
        expect(ids(today.plan)).toEqual(["open", "done"])
    })

    it("lists open tasks planned for an earlier day as unfinished, but not done ones", () => {
        const today = buildToday({
            tasks: [task("missed", { plannedFor: "2026-10-10" }), task("finished", { status: "done", plannedFor:
"2026-10-10" })],
            goals: [],
            today: TODAY,
        })
        expect(ids(today.unfinished)).toEqual(["missed"])
    })

    it("suggests open tasks due today or overdue as urgent, high priority first", () => {
        const today = buildToday({
            tasks: [
                task("due-today", { priority: "medium", dueDate: TODAY }),
                task("overdue-high", { priority: "high", dueDate: "2026-10-09" }),
                task("future", { priority: "high", dueDate: "2026-10-12" }),
                task("done-overdue", { status: "done", dueDate: "2026-10-09" }),
            ],
            goals: [],
            today: TODAY,
        })
        expect(ids(today.urgent)).toEqual(["overdue-high", "due-today"])
    })

    it("shows an overdue task planned for today only in the plan", () => {
        const today = buildToday({
            tasks: [task("both", { dueDate: "2026-10-09", plannedFor: TODAY })],
            goals: [],
            today: TODAY,
        })
        expect(ids(today.plan)).toEqual(["both"])
        expect(today.urgent).toEqual([])
    })

    it("shows an overdue task left from an earlier plan only as unfinished", () => {
        const today = buildToday({
            tasks: [task("both", { dueDate: "2026-10-09", plannedFor: "2026-10-10" })],
            goals: [],
            today: TODAY,
        })
        expect(ids(today.unfinished)).toEqual(["both"])
        expect(today.urgent).toEqual([])
    })

    it("suggests each active goal's next step with the goal's name", () => {
        const steps = [task("s1", { status: "done" }), task("s2", { dueDate: "2026-10-20" }), task("s3")]
        const today = buildToday({ tasks: steps, goals: [goal("g1", steps)], today: TODAY })
        expect(today.goalSteps).toEqual([{ goal: { id: "g1", title: "Goal g1" }, step: steps[1] }])
    })

    it("shows an overdue next step once, under urgent", () => {
        const steps = [task("late", { dueDate: "2026-10-01" })]
        const today = buildToday({ tasks: steps, goals: [goal("g1", steps)], today: TODAY })
        expect(ids(today.urgent)).toEqual(["late"])
        expect(today.goalSteps).toEqual([])
    })

    it("doesn't suggest a next step that is already planned for today", () => {
        const steps = [task("planned", { plannedFor: TODAY })]
        const today = buildToday({ tasks: steps, goals: [goal("g1", steps)], today: TODAY })
        expect(today.goalSteps).toEqual([])
    })

    it("doesn't suggest steps from a completed goal", () => {
        const steps = [task("s1")]
        const today = buildToday({ tasks: steps, goals: [goal("g1", steps, "complete")], today: TODAY })
        expect(today.goalSteps).toEqual([])
    })

    it("suggests a goal's following step when its next one is already planned", () => {
        const steps = [task("planned", { dueDate: "2026-10-15", plannedFor: TODAY }), task("after", { dueDate: "2026-10-20" })]
        const today = buildToday({ tasks: steps, goals: [goal("g1", steps)], today: TODAY })
        expect(today.goalSteps.map(s => s.step.id)).toEqual(["after"])
    })
})

describe("dueLabel", () => {
    it("says due today and due tomorrow", () => {
        expect(dueLabel(parseDateOnly("2026-10-11"), TODAY)).toBe("due today")
        expect(dueLabel(parseDateOnly("2026-10-12"), TODAY)).toBe("due tomorrow")
    })

    it("counts days overdue, singular for one", () => {
        expect(dueLabel(parseDateOnly("2026-10-10"), TODAY)).toBe("1 day overdue")
        expect(dueLabel(parseDateOnly("2026-10-08"), TODAY)).toBe("3 days overdue")
    })

    it("shows the date when it's further out", () => {
        expect(dueLabel(parseDateOnly("2026-10-20"), TODAY)).toBe("due Oct 20")
    })

    it("works across a month boundary", () => {
        expect(dueLabel(parseDateOnly("2026-09-30"), "2026-10-01")).toBe("1 day overdue")
    })
})

describe("groupPlan", () => {
    const block = (id: string, startTime: string) => ({ id, startTime, endTime: "23:59", label: `Block ${id}` })
    const planned = (id: string, scheduleBlockId: string | null, status = "todo") => ({ id, status, scheduleBlockId })

    const morning = block("morning", "09:00")
    const evening = block("evening", "17:00")

    it("groups tasks by block in time order, whatever order the blocks arrive in", () => {
        const { groups } = groupPlan([planned("a", "evening"), planned("b", "morning")], [evening, morning])

        expect(groups.map(g => g.block.id)).toEqual(["morning", "evening"])
        expect(groups.map(g => g.tasks.map(t => t.id))).toEqual([["b"], ["a"]])
    })

    it("leaves out blocks with no tasks", () => {
        const { groups } = groupPlan([planned("a", "evening")], [morning, evening])

        expect(groups.map(g => g.block.id)).toEqual(["evening"])
    })

    it("puts tasks without a block under anytime", () => {
        const { anytime } = groupPlan([planned("a", null), planned("b", "morning")], [morning])

        expect(anytime.map(t => t.id)).toEqual(["a"])
    })

    it("keeps the plan's order inside a group, so done tasks stay after open ones", () => {
        const { groups } = groupPlan(
            [planned("open", "morning"), planned("done", "morning", "done")],
            [morning]
        )

        expect(groups[0].tasks.map(t => t.id)).toEqual(["open", "done"])
    })

    it("shows a task whose block isn't on today's schedule under anytime instead of hiding it", () => {
        const { groups, anytime } = groupPlan([planned("a", "moved-to-monday")], [morning])

        expect(groups).toEqual([])
        expect(anytime.map(t => t.id)).toEqual(["a"])
    })

    it("counts every task in each block, done ones included", () => {
        const { counts } = groupPlan(
            [planned("a", "morning"), planned("b", "morning", "done"), planned("c", null)],
            [morning, evening]
        )

        expect(counts).toEqual({ morning: 2 })
    })

    it("puts everything under anytime when today has no blocks", () => {
        const { groups, anytime } = groupPlan([planned("a", null), planned("b", null)], [])

        expect(groups).toEqual([])
        expect(anytime).toHaveLength(2)
    })
})