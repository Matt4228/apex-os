// tests/lib/demo-seed.test.ts
import { seedDemo } from "@/lib/demo/seedDemo"
import { parseDateOnly } from "@/lib/dates"
import { occurrences, weekDates, type Exception, type SeriesBlock } from "@/lib/occurrences"
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


// The mock hands back each block with a predictable id, the way the database returns created rows
function returnBlocksWithIds() {
    prismaMock.scheduleBlock.createManyAndReturn.mockImplementation((async (args: { data: object[] }) =>
        args.data.map((block, i) => ({ ...block, id: `block-${i}` }))) as never)
}

function seededBlocks(): SeriesBlock[] {
    const [args] = prismaMock.scheduleBlock.createManyAndReturn.mock.calls[0]
    // The seed leaves endsOn and endsAfter out unless it sets them; the database fills in null
    return (args?.data as unknown as Partial<SeriesBlock>[]).map((block, i) => ({
        ...block,
        endsOn: block.endsOn ?? null,
        endsAfter: block.endsAfter ?? null,
        id: `block-${i}`,
    }) as SeriesBlock)
}

function seededChanges(): Exception[] {
    const [args] = prismaMock.blockException.createMany.mock.calls[0]
    return (args?.data as unknown as Partial<Exception>[]).map(change => ({
        cancelled: false, newDate: null, startTime: null, endTime: null, label: null, category: null, ...change,
    })) as Exception[]
}

/** What the calendar shows on these days, as "date label start-end" lines */
const calendar = (from: string, to: string) =>
    occurrences(seededBlocks(), seededChanges(), from, to).map(o => `${o.date.slice(5)} ${o.label} ${o.startTime}-${o.endTime}`)

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
        const onToday = occurrences(blocks, seededChanges(), date, date).map(o => o.blockId)
        for (const task of inBlocks) {
            expect(sameDay(task.plannedFor, date)).toBe(true)
            expect(onToday).toContain(task.scheduleBlockId)
        }
    })

    it("shows a different calendar each week, with something that happens only once", async () => {
        await run()
        const [last, current, next] = ["2026-10-04", "2026-10-11", "2026-10-18"].map(sunday => {
            const days = weekDates(sunday)
            // The same blocks repeat every week; compare the lines without their dates
            return calendar(days[0], days[6]).map(line => line.slice(6)).sort().join("\n")
        })

        expect(new Set([last, current, next]).size).toBe(3)
        expect(calendar("2026-10-11", "2026-10-17")).toContain("10-15 Dentist 14:00-15:00")
        expect(calendar("2026-10-18", "2026-10-24")).toContain("10-21 Onsite interview 10:00-15:00")
    })

    it("changes days that the series really has", async () => {
        await run()

        // Wednesday's lunch moves, last Friday's meetings are cancelled, next Monday's deep work ends early
        expect(calendar("2026-10-14", "2026-10-14")).toContain("10-14 Lunch and walk 12:30-13:30")
        expect(calendar("2026-10-09", "2026-10-09").some(line => line.includes("Meetings"))).toBe(false)
        expect(calendar("2026-10-19", "2026-10-19")).toContain("10-19 Deep work: product engineering 09:00-11:00")
    })

    it("ends the course after six classes", async () => {
        await run()

        const classes = calendar("2026-09-01", "2026-12-31").filter(line => line.includes("Postgres course"))
        expect(classes).toHaveLength(6)
    })

    it("leaves some of today's plan for anytime", async () => {
        await run()

        const anytime = seededTasks().filter(t => sameDay(t.plannedFor, "2026-10-11") && !t.scheduleBlockId)
        expect(anytime.length).toBeGreaterThan(0)
    })
})