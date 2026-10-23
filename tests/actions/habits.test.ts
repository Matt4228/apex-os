// tests/actions/habits.test.ts
import { toggleHabitActive, toggleHabitLog, updateHabit } from "@/app/actions/habits"
import { Prisma } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

const ownedHabit = {
    id: "habit-1",
    userId: "user-1",
    title: "Read",
    category: null,
    frequency: "daily" as const,
    targetPerWeek: 7,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
}

describe("toggleHabitLog", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("returns Unauthorized when there is no session", async () => {
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

    it("adds a log when that day has none", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habitLog.deleteMany.mockResolvedValue({ count: 0 })
        const log = { id: "log-1", habitId: "habit-1", completedOn: new Date("2026-09-02T00:00:00Z"), note: null, createdAt: new Date() }
        prismaMock.habitLog.create.mockResolvedValue(log)

        const result = await toggleHabitLog("habit-1", "2026-09-02")

        expect(result).toEqual({ action: "added", date: "2026-09-02", log })
    })

    it("removes the day's log when there is one, without adding another", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habitLog.deleteMany.mockResolvedValue({ count: 1 })

        const result = await toggleHabitLog("habit-1", "2026-09-02")

        expect(result).toEqual({ action: "removed", date: "2026-09-02" })
        expect(prismaMock.habitLog.create).not.toHaveBeenCalled()
    })

    it("stores the check-in as the calendar day, whatever the server's timezone", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habitLog.deleteMany.mockResolvedValue({ count: 0 })

        await toggleHabitLog("habit-1", "2026-09-02")

        const day = new Date("2026-09-02T00:00:00Z")
        expect(prismaMock.habitLog.deleteMany).toHaveBeenCalledWith({ where: { habitId: "habit-1", completedOn: day } })
        expect(prismaMock.habitLog.create).toHaveBeenCalledWith({ data: { habitId: "habit-1", completedOn: day } })
    })

    it("reports the day as logged when a second click's add loses the race to the first", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habitLog.deleteMany.mockResolvedValue({ count: 0 })
        prismaMock.habitLog.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "7.7.0" }),
        )

        expect(await toggleHabitLog("habit-1", "2026-09-02")).toEqual({ action: "added", date: "2026-09-02" })
    })

    it("lets other database errors through", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habitLog.deleteMany.mockResolvedValue({ count: 0 })
        prismaMock.habitLog.create.mockRejectedValue(new Error("connection lost"))

        await expect(toggleHabitLog("habit-1", "2026-09-02")).rejects.toThrow("connection lost")
    })

    it.each(["", "yesterday", "2026-9-2", "2026-02-30", "2026-09-02T00:00:00Z"])("rejects %j as a date", async date => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)

        expect(await toggleHabitLog("habit-1", date)).toEqual({ error: "Invalid date" })
        expect(prismaMock.habitLog.deleteMany).not.toHaveBeenCalled()
        expect(prismaMock.habitLog.create).not.toHaveBeenCalled()
    })
})

const habitForm = (fields: Record<string, string>) => {
    const formData = new FormData()
    for (const [key, value] of Object.entries(fields)) formData.set(key, value)
    return formData
}

describe("updateHabit", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    const edit = { title: "Read 20 pages", category: "", frequency: "weekly", targetPerWeek: "3" }

    it("returns Unauthorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        expect(await updateHabit("habit-1", habitForm(edit))).toEqual({ error: "Unauthorized" })
        expect(prismaMock.habit.update).not.toHaveBeenCalled()
    })

    it("refuses to edit another user's habit", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "attacker" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(null)

        expect(await updateHabit("victim-habit", habitForm(edit))).toEqual({ error: "Not found" })
        expect(prismaMock.habit.findFirst).toHaveBeenCalledWith({ where: { id: "victim-habit", userId: "attacker" } })
        expect(prismaMock.habit.update).not.toHaveBeenCalled()
    })

    it("rejects a habit with no title", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)

        expect(await updateHabit("habit-1", habitForm({ ...edit, title: "" }))).toEqual({ error: "Invalid input" })
        expect(prismaMock.habit.update).not.toHaveBeenCalled()
    })

    it("saves the new fields, with no category as null", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)
        prismaMock.habit.update.mockResolvedValue({ ...ownedHabit, title: "Read 20 pages" })

        await updateHabit("habit-1", habitForm(edit))

        expect(prismaMock.habit.update).toHaveBeenCalledWith({
            where: { id: "habit-1" },
            data: { title: "Read 20 pages", category: null, frequency: "weekly", targetPerWeek: 3 },
        })
    })
})

describe("toggleHabitActive", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("refuses to pause another user's habit", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "attacker" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(null)

        expect(await toggleHabitActive("victim-habit", false)).toEqual({ error: "Not found" })
        expect(prismaMock.habit.update).not.toHaveBeenCalled()
    })

    it("pauses the owner's habit", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.habit.findFirst.mockResolvedValue(ownedHabit)

        await toggleHabitActive("habit-1", false)

        expect(prismaMock.habit.update).toHaveBeenCalledWith({ where: { id: "habit-1" }, data: { isActive: false } })
    })
})
