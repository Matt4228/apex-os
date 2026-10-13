// tests/lib/schedule-data.test.ts
import { parseDateOnly } from "@/lib/dates"
import { loadBlocks } from "@/lib/scheduleData"
import { describe, expect, it } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

describe("loadBlocks", () => {
    const first = parseDateOnly("2026-10-11")
    const last = parseDateOnly("2026-10-17")

    it("asks only for the user's blocks that can show in the range", async () => {
        prismaMock.scheduleBlock.findMany.mockResolvedValue([])
        prismaMock.blockException.findMany.mockResolvedValue([])

        await loadBlocks("user-1", "2026-10-11", "2026-10-17")

        expect(prismaMock.scheduleBlock.findMany).toHaveBeenCalledWith({
            where: {
                userId: "user-1",
                OR: [
                    { startDate: { lte: last }, OR: [{ endsOn: null }, { endsOn: { gte: first } }] },
                    { exceptions: { some: { newDate: { gte: first, lte: last } } } },
                ],
            },
        })
    })

    it("asks only for the user's changed days in the range or moved into it", async () => {
        prismaMock.scheduleBlock.findMany.mockResolvedValue([])
        prismaMock.blockException.findMany.mockResolvedValue([])

        await loadBlocks("user-1", "2026-10-11", "2026-10-17")

        expect(prismaMock.blockException.findMany).toHaveBeenCalledWith({
            where: {
                block: { userId: "user-1" },
                OR: [{ date: { gte: first, lte: last } }, { newDate: { gte: first, lte: last } }],
            },
        })
    })
})
