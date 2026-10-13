// tests/lib/user-categories.test.ts
import { getUserCategories } from "@/lib/userCategories"
import { describe, expect, it } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

describe("getUserCategories", () => {
    it("merges the user's block, goal and habit categories, once each", async () => {
        prismaMock.scheduleBlock.findMany.mockResolvedValue([{ category: "Work" }, { category: "Career" }] as never)
        prismaMock.goal.findMany.mockResolvedValue([{ category: "career" }, { category: "Music" }] as never)
        prismaMock.habit.findMany.mockResolvedValue([{ category: "Wellness" }] as never)

        expect(await getUserCategories("user-1")).toEqual(["Career", "Music", "Wellness", "Work"])
    })

    it("only reads that user's rows", async () => {
        prismaMock.scheduleBlock.findMany.mockResolvedValue([])
        prismaMock.goal.findMany.mockResolvedValue([])
        prismaMock.habit.findMany.mockResolvedValue([])

        await getUserCategories("user-1")

        for (const table of [prismaMock.scheduleBlock, prismaMock.goal, prismaMock.habit]) {
            expect(table.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1", category: { not: null } } }))
        }
    })
})
