import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { parseDateOnly } from "@/lib/dates"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

function blockForm(overrides: Record<string, string> = {}): FormData {
    const formData = new FormData()
    const fields = {
        label: "Deep work",
        category: "Work",
        startDate: "2026-10-12",
        startTime: "09:00",
        endTime: "10:00",
        repeat: "none",
        repeatDays: "",
        ends: "never",
        endsOn: "",
        endsAfter: "",
        ...overrides,
    }
    for (const [key, value] of Object.entries(fields)) formData.set(key, value)
    return formData
}

const savedBlock = (o: object = {}) => ({
    id: "block-1",
    userId: "user-1",
    label: "Deep work",
    category: "Work",
    startTime: "09:00",
    endTime: "10:00",
    startDate: parseDateOnly("2026-10-12"),
    repeat: "weekday",
    repeatDays: [],
    endsOn: null,
    endsAfter: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...o,
})

const change = (id: string, day: string) => ({
    id,
    blockId: "block-1",
    date: parseDateOnly(day),
    cancelled: true,
    newDate: null,
    startTime: null,
    endTime: null,
    label: null,
    category: null,
})

beforeEach(() => {
    mockedAuth.mockReset()
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
})

describe("schedule block validation", () => {
    it.each([
        [{ startTime: "9am" }, "Start time must be HH:MM"],
        [{ startTime: "14:00", endTime: "13:00" }, "End time must be after start time"],
        [{ startDate: "next week" }, "Pick a date"],
        [{ repeat: "yearly" }, "Pick how it repeats"],
        [{ repeat: "weekly", repeatDays: "" }, "Pick at least one day for it to repeat on"],
        [{ repeat: "weekly", repeatDays: "1,9" }, "Pick days of the week"],
        [{ repeat: "daily", ends: "on", endsOn: "2026-10-01" }, "The end date can't be before the start date"],
        [{ repeat: "daily", ends: "on", endsOn: "" }, "The end date can't be before the start date"],
        [{ repeat: "daily", ends: "after", endsAfter: "0" }, "It has to happen at least once"],
    ])("rejects %o", async (overrides, message) => {
        expect(await createScheduleBlock(blockForm(overrides))).toEqual({ error: message })
        expect(prismaMock.scheduleBlock.create).not.toHaveBeenCalled()
    })

    it("accepts a block that ends at midnight (24:00)", async () => {
        prismaMock.scheduleBlock.create.mockResolvedValue(savedBlock() as never)

        await createScheduleBlock(blockForm({ startTime: "23:00", endTime: "24:00" }))

        expect(prismaMock.scheduleBlock.create).toHaveBeenCalled()
    })
})

describe("createScheduleBlock", () => {
    it("returns Unauthorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        expect(await createScheduleBlock(blockForm())).toEqual({ error: "Unauthorized" })
    })

    it("saves a weekly block with its days and end date for the signed-in user", async () => {
        prismaMock.scheduleBlock.create.mockResolvedValue(savedBlock() as never)

        await createScheduleBlock(blockForm({ repeat: "weekly", repeatDays: "3,1,3", ends: "on", endsOn: "2026-12-31" }))

        expect(prismaMock.scheduleBlock.create).toHaveBeenCalledWith({
            data: {
                userId: "user-1",
                label: "Deep work",
                category: "Work",
                startDate: parseDateOnly("2026-10-12"),
                startTime: "09:00",
                endTime: "10:00",
                repeat: "weekly",
                repeatDays: [1, 3],
                endsOn: parseDateOnly("2026-12-31"),
                endsAfter: null,
            },
        })
    })

    it("clears fields that don't apply: no days unless weekly, no end unless it repeats", async () => {
        prismaMock.scheduleBlock.create.mockResolvedValue(savedBlock() as never)

        await createScheduleBlock(blockForm({ repeat: "none", repeatDays: "1", ends: "after", endsAfter: "5", category: "" }))

        expect(prismaMock.scheduleBlock.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ repeat: "none", repeatDays: [], endsOn: null, endsAfter: null, category: null }),
        })
    })

    it("saves 'after N times' as a count", async () => {
        prismaMock.scheduleBlock.create.mockResolvedValue(savedBlock() as never)

        await createScheduleBlock(blockForm({ repeat: "daily", ends: "after", endsAfter: "6" }))

        expect(prismaMock.scheduleBlock.create).toHaveBeenCalledWith({ data: expect.objectContaining({ endsAfter: 6, endsOn: null }) })
    })
})

describe("updateScheduleBlock", () => {
    it("refuses to change another user's block", async () => {
        prismaMock.scheduleBlock.findFirst.mockResolvedValue(null)

        expect(await updateScheduleBlock("victim-block", blockForm())).toEqual({ error: "Not found" })
        expect(prismaMock.scheduleBlock.findFirst).toHaveBeenCalledWith({ where: { id: "victim-block", userId: "user-1" } })
        expect(prismaMock.scheduleBlock.update).not.toHaveBeenCalled()
    })

    it("validates before looking anything up", async () => {
        expect(await updateScheduleBlock("block-1", blockForm({ startTime: "14:00", endTime: "13:00" }))).toHaveProperty("error")
        expect(prismaMock.scheduleBlock.update).not.toHaveBeenCalled()
    })

    it("drops changed days the new rule no longer lands on, and keeps the rest", async () => {
        // Every weekday becomes Mondays only: Wednesday's change has no day left to change
        prismaMock.scheduleBlock.findFirst.mockResolvedValue(savedBlock() as never)
        prismaMock.scheduleBlock.update.mockResolvedValue(savedBlock({ repeat: "weekly", repeatDays: [1] }) as never)
        prismaMock.blockException.findMany.mockResolvedValue([change("monday", "2026-10-19"), change("wednesday", "2026-10-14")])

        const result = await updateScheduleBlock("block-1", blockForm({ repeat: "weekly", repeatDays: "1" }))

        expect(prismaMock.blockException.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["wednesday"] } } })
        expect(result).toMatchObject({ exceptions: [{ id: "monday" }] })
    })

    it("deletes nothing when every changed day still happens", async () => {
        prismaMock.scheduleBlock.findFirst.mockResolvedValue(savedBlock() as never)
        prismaMock.scheduleBlock.update.mockResolvedValue(savedBlock() as never)
        prismaMock.blockException.findMany.mockResolvedValue([change("monday", "2026-10-19")])

        await updateScheduleBlock("block-1", blockForm({ repeat: "weekday" }))

        expect(prismaMock.blockException.deleteMany).not.toHaveBeenCalled()
    })
})
