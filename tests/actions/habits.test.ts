// tests/actions/habits.test.ts
import { toggleHabitLog } from "@/app/actions/habits"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

const ownedHabit = {
    id: "habit-1",
    userId: "user-1",
    title: "Read",
    category: null,
    frequency: "daily",
    targetPerWeek: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
}

describe("toggleHabitLog", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("returns Unathorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        const result = await toggleHabitLog("habit-1", "2026-09-02")

        expect(result).toEqual({ error: "Unauthorized" })
        expect(prismaMock.habitLog.create).not.toHaveBeenCalled()
    })

    it("refuses to toggle a log for a habit owned by another user", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "attacker" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(null)

        const result = await toggleHabitLog("victim-habit", "2026-09-02")

        expect(prismaMock.habit.findFirst).toHaveBeenCalledWith({
            where: { id: "victim-habit", userId: "attacker" },
        })
        expect(result).toEqual({ error: "Not found" })
        expect(prismaMock.habitLog.create).not.toHaveBeenCalled()
        expect(prismaMock.habitLog.delete).not.toHaveBeenCalled()
    })

    it("adds a log when none exists yet for that day", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } }  as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habitLog.findFirst.mockResolvedValue(null)
        prismaMock.habitLog.create.mockResolvedValue({
            id: "log-1",
            habitId: "habit-1",
            completedOn: new Date(2026, 8, 2),
            note: null,
            createdAt: new Date(),
        })

        const result = await toggleHabitLog("habit-1", "2026-09-02")

        expect(result).toMatchObject({ action: "added", date: "2026-09-02" })
        expect(prismaMock.habitLog.create).toHaveBeenCalled()
    })

    it("removes the existing log when one is already present for that day", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habitLog.findFirst.mockResolvedValue({
            id: "log-1",
            habitId: "habit-1",
            completedOn: new Date(2026, 8, 2),
            note: null,
            createdAt: new Date(),
        })

        const result = await toggleHabitLog("habit-1", "2026-09-02")

        expect(result).toEqual({ action: "removed", date: "2026-09-02"})
        expect(prismaMock.habitLog.delete).toHaveBeenCalledWith({ where: { id: "log-1" } })
    })
})