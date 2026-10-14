// tests/actions/schedule-scopes.test.ts
import { removeBlockDays, updateScheduleBlock } from "@/app/actions/schedule"
import { parseDateOnly } from "@/lib/dates"
import type { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

// A weekday block that began Monday Sep 28, 2026: lunch, 12:00 to 13:00
const series = (o: object = {}) => ({
    id: "lunch",
    userId: "user-1",
    label: "Lunch",
    category: "Personal",
    startTime: "12:00",
    endTime: "13:00",
    startDate: parseDateOnly("2026-09-28"),
    repeat: "weekday",
    repeatDays: [],
    endsOn: null,
    endsAfter: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...o,
})

/** The form as it's sent for one day: that day's date and fields, plus the series' repeat rule */
function dayForm(overrides: Record<string, string> = {}) {
    const formData = new FormData()
    const fields = {
        label: "Lunch", category: "Personal", startDate: "2026-10-14", startTime: "12:00", endTime: "13:00",
        repeat: "weekday", repeatDays: "", ends: "never", endsOn: "", endsAfter: "", ...overrides,
    }
    for (const [key, value] of Object.entries(fields)) formData.set(key, value)
    return formData
}

const day = parseDateOnly

beforeEach(() => {
    mockedAuth.mockReset()
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    prismaMock.scheduleBlock.findFirst.mockResolvedValue(series() as never)
    prismaMock.blockException.findMany.mockResolvedValue([])
    // Run an interactive transaction against the same mock
    prismaMock.$transaction.mockImplementation((async (fn: (tx: PrismaClient) => unknown) => fn(prismaMock as unknown as PrismaClient)) as never)
})

describe("changing one day", () => {
    const thisDay = { date: "2026-10-14", scope: "this" as const }

    it("saves only what differs from the series, for that day", async () => {
        await updateScheduleBlock("lunch", dayForm({ startTime: "12:30", endTime: "13:30" }), thisDay)

        expect(prismaMock.blockException.upsert).toHaveBeenCalledWith({
            where: { blockId_date: { blockId: "lunch", date: day("2026-10-14") } },
            create: { blockId: "lunch", date: day("2026-10-14"), cancelled: false, newDate: null, startTime: "12:30", endTime: "13:30", label: null, category: null },
            update: { cancelled: false, newDate: null, startTime: "12:30", endTime: "13:30", label: null, category: null },
        })
        expect(prismaMock.scheduleBlock.update).not.toHaveBeenCalled()
    })

    it("moves that day to another date", async () => {
        await updateScheduleBlock("lunch", dayForm({ startDate: "2026-10-17" }), thisDay)

        expect(prismaMock.blockException.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ newDate: day("2026-10-17") }),
        }))
    })

    it("won't move it onto a day the block already has", async () => {
        expect(await updateScheduleBlock("lunch", dayForm({ startDate: "2026-10-15" }), thisDay)).toEqual({ error: "This block already happens on that day" })
        expect(prismaMock.blockException.upsert).not.toHaveBeenCalled()
    })

    it("clears the change when the day is set back to match the series", async () => {
        await updateScheduleBlock("lunch", dayForm(), thisDay)

        expect(prismaMock.blockException.deleteMany).toHaveBeenCalledWith({ where: { blockId: "lunch", date: day("2026-10-14") } })
        expect(prismaMock.blockException.upsert).not.toHaveBeenCalled()
    })

    it("refuses a day that isn't part of the block", async () => {
        expect(await updateScheduleBlock("lunch", dayForm(), { date: "2026-10-17", scope: "this" })).toEqual({ error: "That day isn't part of this block" })
    })

    it("refuses a scope it doesn't know", async () => {
        expect(await updateScheduleBlock("lunch", dayForm(), { date: "2026-10-14", scope: "some" as never })).toEqual({ error: "Invalid input" })
    })
})

describe("changing this and following days", () => {
    const following = { date: "2026-10-14", scope: "following" as const }

    it("ends the series the day before and starts a new one with the changes", async () => {
        prismaMock.scheduleBlock.update.mockResolvedValue(series({ endsOn: day("2026-10-13") }) as never)
        prismaMock.scheduleBlock.create.mockResolvedValue(series({ id: "lunch-2" }) as never)

        const result = await updateScheduleBlock("lunch", dayForm({ startTime: "12:30", endTime: "13:30" }), following)

        expect(prismaMock.scheduleBlock.update).toHaveBeenCalledWith({ where: { id: "lunch" }, data: { endsOn: day("2026-10-13"), endsAfter: null } })
        expect(prismaMock.scheduleBlock.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: "user-1", startDate: day("2026-10-14"), startTime: "12:30", repeat: "weekday" }),
        })
        expect(result).toMatchObject({ block: { id: "lunch" }, created: { block: { id: "lunch-2" } } })
    })

    it("turns a count into an end date, drops the old version's later changes, and moves later tasks along", async () => {
        prismaMock.scheduleBlock.findFirst.mockResolvedValue(series({ endsAfter: 30 }) as never)
        prismaMock.scheduleBlock.create.mockResolvedValue(series({ id: "lunch-2" }) as never)

        await updateScheduleBlock("lunch", dayForm(), following)

        expect(prismaMock.scheduleBlock.update).toHaveBeenCalledWith({ where: { id: "lunch" }, data: { endsOn: day("2026-10-13"), endsAfter: null } })
        expect(prismaMock.blockException.deleteMany).toHaveBeenCalledWith({ where: { blockId: "lunch", date: { gte: day("2026-10-14") } } })
        expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
            where: { scheduleBlockId: "lunch", plannedFor: { gte: day("2026-10-14") } },
            data: { scheduleBlockId: "lunch-2" },
        })
    })

    it("changes the whole series when it's the series' first day", async () => {
        prismaMock.scheduleBlock.update.mockResolvedValue(series() as never)

        await updateScheduleBlock("lunch", dayForm({ startDate: "2026-09-28", startTime: "12:30", endTime: "13:30" }), { date: "2026-09-28", scope: "following" })

        expect(prismaMock.scheduleBlock.create).not.toHaveBeenCalled()
        expect(prismaMock.scheduleBlock.update).toHaveBeenCalledWith({ where: { id: "lunch" }, data: expect.objectContaining({ startTime: "12:30" }) })
    })
})

describe("changing all days", () => {
    it("keeps the series' own start date, since the form shows the day it was opened on", async () => {
        prismaMock.scheduleBlock.update.mockResolvedValue(series() as never)

        await updateScheduleBlock("lunch", dayForm({ startTime: "12:30", endTime: "13:30" }), { date: "2026-10-14", scope: "all" })

        expect(prismaMock.scheduleBlock.update).toHaveBeenCalledWith({
            where: { id: "lunch" },
            data: expect.objectContaining({ startDate: day("2026-09-28"), startTime: "12:30" }),
        })
    })
})

describe("removeBlockDays", () => {
    it("cancels one day and takes its tasks back to anytime", async () => {
        await removeBlockDays("lunch", "2026-10-14", "this")

        expect(prismaMock.blockException.upsert).toHaveBeenCalledWith({
            where: { blockId_date: { blockId: "lunch", date: day("2026-10-14") } },
            create: { blockId: "lunch", date: day("2026-10-14"), cancelled: true, newDate: null, startTime: null, endTime: null, label: null, category: null },
            update: { cancelled: true, newDate: null, startTime: null, endTime: null, label: null, category: null },
        })
        expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
            where: { scheduleBlockId: "lunch", plannedFor: day("2026-10-14") },
            data: { scheduleBlockId: null },
        })
    })

    it("ends the series the day before for this and following", async () => {
        prismaMock.scheduleBlock.update.mockResolvedValue(series({ endsOn: day("2026-10-13") }) as never)

        await removeBlockDays("lunch", "2026-10-14", "following")

        expect(prismaMock.scheduleBlock.update).toHaveBeenCalledWith({ where: { id: "lunch" }, data: { endsOn: day("2026-10-13"), endsAfter: null } })
        expect(prismaMock.scheduleBlock.delete).not.toHaveBeenCalled()
    })

    it("deletes the block when following starts on its first day", async () => {
        expect(await removeBlockDays("lunch", "2026-09-28", "following")).toEqual({ deleted: true })
        expect(prismaMock.scheduleBlock.delete).toHaveBeenCalledWith({ where: { id: "lunch" } })
    })

    it("refuses another user's block, and days the block doesn't have", async () => {
        prismaMock.scheduleBlock.findFirst.mockResolvedValue(null)
        expect(await removeBlockDays("victim", "2026-10-14", "this")).toEqual({ error: "Not found" })

        prismaMock.scheduleBlock.findFirst.mockResolvedValue(series() as never)
        expect(await removeBlockDays("lunch", "2026-10-17", "this")).toEqual({ error: "That day isn't part of this block" })
        expect(prismaMock.blockException.upsert).not.toHaveBeenCalled()
    })

    it("only removes some days: 'all' goes through the undoable delete", async () => {
        expect(await removeBlockDays("lunch", "2026-10-14", "all" as never)).toEqual({ error: "Invalid input" })
    })
})
