// tests/actions/goals.tests.ts
import { createGoal, logGoalEntry } from "@/app/actions/goals"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

function formDataFrom(entries: Record<string, string>): FormData {
    const formData = new FormData()
    for (const [key, value] of Object.entries(entries)) {
        formData.set(key, value)
    }
    return formData
}

describe("createGoal", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("returns Unathorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        const result = await createGoal(formDataFrom({ title: "Run a marathon" }))

        expect(result).toEqual({ error: "Unathorized" })
        expect(prismaMock.goal.create).not.toHaveBeenCalled()
    })

    it("persists targetValue read from the targetvalue form field", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.goal.create.mockResolvedValue({
            id: "goal-1",
            userId: "user-1",
            title: "Run a marathon",
            description: null,
            category: null,
            status: "active",
            targetDate: null,
            targetValue: 26.2,
            unit: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        await createGoal(formDataFrom({ title: "Run a marathon", targetValue: "26.2" }))

        expect(prismaMock.goal.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ targetValue: 26.2 }),
        })
    })
})

describe("logGoalEntry", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("returns Unathorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        const result = await logGoalEntry("goal-1", formDataFrom({ value: "5" }))

        expect(result).toEqual({ error: "Unauthorized" })
        expect(prismaMock.goalEntry.create).not.toHaveBeenCalled()
    })

    it("refuses to log an entry against a goal owned by another user", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "attacker" } } as never)
        prismaMock.goal.findFirst.mockResolvedValue(null)

        const result = await logGoalEntry("victim-goal", formDataFrom({ value: "999" }))

        expect(prismaMock.goal.findFirst).toHaveBeenCalledWith({
            where: { id: "victim-goal", userId: "attacker" },
        })
        expect(result).toEqual({ error: "Not found" })
        expect(prismaMock.goalEntry.create).not.toHaveBeenCalled()
    })

    it("logs an entry when the goal belongs to the caller", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.goal.findFirst.mockResolvedValue({
            id: "goal-1",
            userId: "user-1",
            title: "Run a marathon",
            description: null,
            category: null,
            status: "active",
            targetDate: null,
            targetValue: null,
            unit: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        prismaMock.goalEntry.create.mockResolvedValue({
            id: "entry-1",
            goalId: "goal-1",
            value: 5,
            note: null,
            loggedOn: new Date(),
            createdAt: new Date(),
        })

        const result = await logGoalEntry("goal-1", formDataFrom({ value: "5" }))

        expect(prismaMock.goalEntry.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ goalId: "goal-1", value: 5 }),
        })
        expect(result).toHaveProperty("entry")
    })
})