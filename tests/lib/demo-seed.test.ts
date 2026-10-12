// tests/lib/demo-seed.test.ts
import { seedDemo } from "@/lib/demo/seedDemo"
import { formatDateOnly, parseDateOnly } from "@/lib/dates"
import type { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

// Noon in New York on Sunday, October 11, 2026
const NOON_NY = new Date("2026-10-11T16:00:00Z")

type SeedTask = { title: string; status: string; dueDate?: Date | null; plannedFor?: Date | null; scheduleBlockId?: string | null }

const run = (now = NOON_NY) => seedDemo(prismaMock as unknown as PrismaClient, now)

function seededTasks(): SeedTask[] {
    const steps = prismaMock.goal.create.mock.calls.flatMap(
        ([args]) => ((args.data.tasks as unknown as { create?: SeedTask[] } | undefined)?.create ?? [])
    )
    const standalone = prismaMock.task.createMany.mock.calls.flatMap(([args]) => (args?.data ?? []) as unknown as SeedTask[])
    return [...steps, ...standalone]
}

const sameDay = (a: Date | null | undefined, day: string) => a?.getTime() === parseDateOnly(day).getTime()

type SeedBlock = { id: string; dayOfWeek: string; label: string }

// The mock hands back each block with a predictable id, the way the database returns created rows
function returnBlocksWithIds() {
    prismaMock.scheduleBlock.createManyAndReturn.mockImplementation((async (args: { data: object[] }) =>
        args.data.map((block, i) => ({ ...block, id: `block-${i}` }))) as never)
}

function seededBlocks(): SeedBlock[] {
    const [args] = prismaMock.scheduleBlock.createManyAndReturn.mock.calls[0]
    return (args?.data as unknown as Omit<SeedBlock, "id">[]).map((block, i) => ({ ...block, id: `block-${i}` }))
}

describe("seedDemo", () => {
    beforeEach(() => {
        prismaMock.user.upsert.mockResolvedValue({ id: "demo-1" } as never)
        returnBlocksWithIds()
    })

    it("breaks at least two goals into steps", async () => {
        await run()

        const goalsWithSteps = prismaMock.goal.create.mock.calls.filter(
            ([args]) => ((args.data.tasks as unknown as { create?: unknown[] } | undefined)?.create ?? []).length >= 3
        )
        expect(goalsWithSteps.length).toBeGreaterThanOrEqual(2)
    })

    it("plans five tasks for today, two of them already done", async () => {
        await run()

        const planned = seededTasks().filter(t => sameDay(t.plannedFor, "2026-10-11"))
        expect(planned).toHaveLength(5)
        expect(planned.filter(t => t.status === "done")).toHaveLength(2)
    })

    it("uses New York's date late in the evening, when UTC is already tomorrow", async () => {
        await run(new Date("2026-10-12T02:00:00Z"))

        const planned = seededTasks().filter(t => sameDay(t.plannedFor, "2026-10-11"))
        expect(planned).toHaveLength(5)
    })

    it("leaves a task unfinished from yesterday's plan and one overdue", async () => {
        await run()
        const tasks = seededTasks()

        expect(tasks.some(t => t.status === "todo" && sameDay(t.plannedFor, "2026-10-10"))).toBe(true)
        expect(tasks.some(t => t.status === "todo" && !t.plannedFor && t.dueDate && t.dueDate <
            parseDateOnly("2026-10-11"))).toBe(true)
    })

    it("checks some habits off today but not all", async () => {
        await run()

        const doneToday = prismaMock.habit.create.mock.calls.filter(([args]) =>
            ((args.data.logs as unknown as { create: { completedOn: Date }[] }).create).some(l =>
                sameDay(l.completedOn, "2026-10-11"))
        )
        expect(doneToday.length).toBeGreaterThan(0)
        expect(doneToday.length).toBeLessThan(prismaMock.habit.create.mock.calls.length)
    })

    it("creates the same story every run", async () => {
        await run()
        const first = JSON.stringify([prismaMock.goal.create.mock.calls, prismaMock.habit.create.mock.calls,
        prismaMock.task.createMany.mock.calls])
        prismaMock.goal.create.mockClear()
        prismaMock.habit.create.mockClear()
        prismaMock.task.createMany.mockClear()

        await run()
        const second = JSON.stringify([prismaMock.goal.create.mock.calls, prismaMock.habit.create.mock.calls,
        prismaMock.task.createMany.mock.calls])

        expect(second).toBe(first)
    })

    it("has no em dashes in any demo text", async () => {
        await run()

        const text = JSON.stringify([
            prismaMock.scheduleBlock.createManyAndReturn.mock.calls,
            prismaMock.goal.create.mock.calls,
            prismaMock.habit.create.mock.calls,
            prismaMock.task.createMany.mock.calls,
            prismaMock.competition.create.mock.calls,
        ])
        expect(text).not.toContain(String.fromCharCode(0x2014))
    })

    // Monday, October 12 to Sunday, October 18, 2026, each at noon in New York
    const WEEK = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]

    it.each(WEEK)("puts some of the plan for %s into that day's blocks", async date => {
        await run(new Date(`${date}T16:00:00Z`))
        const blocks = seededBlocks()
        const inBlocks = seededTasks().filter(t => t.scheduleBlockId)

        expect(inBlocks.length).toBeGreaterThan(0)
        for (const task of inBlocks) {
            expect(sameDay(task.plannedFor, date)).toBe(true)
            expect(blocks.find(b => b.id === task.scheduleBlockId)?.dayOfWeek).toBe(formatDateOnly(parseDateOnly(date), "EEEE"))
        }
    })

    it("leaves some of today's plan for anytime", async () => {
        await run()

        const anytime = seededTasks().filter(t => sameDay(t.plannedFor, "2026-10-11") && !t.scheduleBlockId)
        expect(anytime.length).toBeGreaterThan(0)
    })
})