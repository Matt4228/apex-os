import { createScheduleBlock, updateScheduleBlock } from "@/app/actions/schedule"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"


function blockForm(overrides: Record<string, string> = {}): FormData {
    const formData = new FormData()
    const fields = { dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00", label: "Deep work", ...overrides }
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value)
    }
    return formData
}

describe("schedule block validation", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
    })

    it("rejects a time that isn't HH:MM", async () => {
        const result = await createScheduleBlock(blockForm({ startTime: "9am" }))

        expect(result).toHaveProperty("error")
        expect(prismaMock.scheduleBlock.create).not.toHaveBeenCalled()
    })

    it("rejects an end time that isn't after the start time", async () => {
        const result = await updateScheduleBlock("block-1", blockForm({ startTime: "14:00", endTime: "13:00" }))

        expect(result).toHaveProperty("error")
        expect(prismaMock.scheduleBlock.update).not.toHaveBeenCalled()
    })

    it("rejects a day that isn't a day of the week", async () => {
        const result = await createScheduleBlock(blockForm({ dayOfWeek: "Funday" }))

        expect(result).toHaveProperty("error")
        expect(prismaMock.scheduleBlock.create).not.toHaveBeenCalled()
    })

    it("accepts a block that ends at midnight (24:00)", async () => {
        const result = await updateScheduleBlock("block-1", blockForm({ startTime: "23:00", endTime: "24:00" }))

        expect(result).not.toHaveProperty("error")
        expect(prismaMock.scheduleBlock.update).toHaveBeenCalled()
    })
})