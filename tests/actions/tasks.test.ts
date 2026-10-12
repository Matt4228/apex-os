// tests/actions/tasks.test.ts
import { assignBlock, createTask, planTask, updateTask, updateTaskStatus } from "@/app/actions/tasks"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"
import { parseDateOnly } from "@/lib/dates"

// revalidatePath needs a Next request context, which tests don't have
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

// getUserToday reads request cookies; tests pin the user's today instead
vi.mock("@/lib/user-today", () => ({ getUserToday: vi.fn(async () => "2026-10-11") }))

function formDataFrom(entries: Record<string, string>): FormData {
    const formData = new FormData()
    for (const [key, value] of Object.entries(entries)) {
        formData.set(key, value)
    }
    return formData
}

const signedIn = () => mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)

describe("updateTaskStatus", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("returns Unathorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        const result = await updateTaskStatus("task-1", "done")

        expect(result).toEqual({ error: "Unauthorized" })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("scopes the update to the caller and sets completedAt when marking done", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } }  as never)

        await updateTaskStatus("task-1", "done")

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { status: "done", completedAt: expect.any(Date) },
        })
    })

    it("clears completedAt when moving a task back out of done", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } }  as never)

        await updateTaskStatus("task-1", "todo")

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { status: "todo", completedAt: null },
        })
    })

    it("rejects a status that isn't todo or done", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)

        const result = await updateTaskStatus("task-1", "banana")

        expect(result).toEqual({ error: "Invalid status" })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })
})

describe("createTask", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("refuses to link a task to a goal the caller doesn't own", async () => {
        signedIn()
        prismaMock.goal.findFirst.mockResolvedValue(null)

        const result = await createTask(formDataFrom({ title: "Sneaky", priority: "high", goalId: "goal-2" }))

        expect(result).toEqual({ error: "Goal not found" })
        expect(prismaMock.goal.findFirst).toHaveBeenCalledWith({
            where: { id: "goal-2", userId: "user-1" },
            select: { id: true },
        })
        expect(prismaMock.task.create).not.toHaveBeenCalled()
    })

    it("links a task to the caller's own goal", async () => {
        signedIn()
        prismaMock.goal.findFirst.mockResolvedValue({ id: "goal-1" } as never)

        await createTask(formDataFrom({ title: "Write README", priority: "medium", goalId: "goal-1" }))

        expect(prismaMock.task.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: "user-1", goalId: "goal-1" }),
        })
    })

    it("creates a standalone task without looking up any goal", async () => {
        signedIn()

        await createTask(formDataFrom({ title: "Groceries", priority: "low" }))

        expect(prismaMock.goal.findFirst).not.toHaveBeenCalled()
        expect(prismaMock.task.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ goalId: null }),
        })
    })
})

describe("updateTask", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("keeps the goal link when the form has no goal field", async () => {
        signedIn()

        await updateTask("task-1", formDataFrom({ title: "Renamed", priority: "high" }))

        const { data } = prismaMock.task.update.mock.calls[0][0]
        expect(data).not.toHaveProperty("goalId")
        expect(prismaMock.goal.findFirst).not.toHaveBeenCalled()
    })

    it("unlinks the task when the goal field is sent empty", async () => {
        signedIn()

        await updateTask("task-1", formDataFrom({ title: "Renamed", priority: "high", goalId: "" }))

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: expect.objectContaining({ goalId: null }),
        })
    })

    it("refuses to move a task onto a goal the caller doesn't own", async () => {
        signedIn()
        prismaMock.goal.findFirst.mockResolvedValue(null)

        const result = await updateTask("task-1", formDataFrom({ title: "Sneaky", priority: "high", goalId: "goal-2"
    }))

        expect(result).toEqual({ error: "Goal not found" })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("links the task to the caller's own goal", async () => {
        signedIn()
        prismaMock.goal.findFirst.mockResolvedValue({ id: "goal-1" } as never)

        await updateTask("task-1", formDataFrom({ title: "Write README", priority: "medium", goalId: "goal-1" }))

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: expect.objectContaining({ goalId: "goal-1" }),
        })
    })
})

describe("planTask", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("returns Unauthorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        expect(await planTask("task-1", true)).toEqual({ error: "Unauthorized" })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("plans the caller's task for the user's today, starting at anytime", async () => {
        signedIn()

        await planTask("task-1", true)

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { plannedFor: parseDateOnly("2026-10-11"), scheduleBlockId: null },
        })
    })

    it("clears the plan and the block when unplanning", async () => {
        signedIn()

        await planTask("task-1", false)

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { plannedFor: null, scheduleBlockId: null },
        })
    })
})

describe("createTask planned for today", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("stores the user's today when the form asks for today", async () => {
        signedIn()

        await createTask(formDataFrom({ title: "Call the bank", priority: "high", plannedFor: "today" }))

        expect(prismaMock.task.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ plannedFor: parseDateOnly("2026-10-11") }),
        })
    })

    it("rejects any other plannedFor value instead of trusting a client date", async () => {
        signedIn()

        const result = await createTask(formDataFrom({ title: "Sneaky", priority: "high", plannedFor: "2030-01-01" }))

        expect(result).toEqual({ error: "Invalid input" })
        expect(prismaMock.task.create).not.toHaveBeenCalled()
    })
})

describe("assignBlock", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    // The mocked user's today, 2026-10-11, is a Sunday
    const plannedFor = (day: string | null) =>
        prismaMock.task.findFirst.mockResolvedValue({ plannedFor: day ? parseDateOnly(day) : null } as never)
    const blockOn = (dayOfWeek: string) => prismaMock.scheduleBlock.findFirst.mockResolvedValue({ dayOfWeek } as
never)

    it("returns Unauthorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        expect(await assignBlock("task-1", "block-1")).toEqual({ error: "Unauthorized" })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("rejects a block id that isn't a string before running any query", async () => {
        signedIn()

        expect(await assignBlock("task-1", { not: "" } as never)).toEqual({ error: "Invalid input" })
        expect(prismaMock.task.findFirst).not.toHaveBeenCalled()
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("returns Task not found for a task that isn't the caller's", async () => {
        signedIn()
        prismaMock.task.findFirst.mockResolvedValue(null)

        expect(await assignBlock("task-1", "block-1")).toEqual({ error: "Task not found" })
        expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            select: { plannedFor: true },
        })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("asks to plan the task first when it isn't planned for today", async () => {
        signedIn()

        plannedFor("2026-10-10")
        expect(await assignBlock("task-1", "block-1")).toEqual({ error: "Plan the task for today first" })

        plannedFor(null)
        expect(await assignBlock("task-1", "block-1")).toEqual({ error: "Plan the task for today first" })

        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("returns Block not found for a block that isn't the caller's", async () => {
        signedIn()
        plannedFor("2026-10-11")
        prismaMock.scheduleBlock.findFirst.mockResolvedValue(null)

        expect(await assignBlock("task-1", "block-1")).toEqual({ error: "Block not found" })
        expect(prismaMock.scheduleBlock.findFirst).toHaveBeenCalledWith({
            where: { id: "block-1", userId: "user-1" },
            select: { dayOfWeek: true },
        })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("rejects a block from another day of the week", async () => {
        signedIn()
        plannedFor("2026-10-11")
        blockOn("Monday")

        expect(await assignBlock("task-1", "block-1")).toEqual({ error: "That block isn't on today's schedule" })
        expect(prismaMock.task.update).not.toHaveBeenCalled()
    })

    it("puts the caller's task into one of today's blocks", async () => {
        signedIn()
        plannedFor("2026-10-11")
        blockOn("Sunday")

        expect(await assignBlock("task-1", "block-1")).toBeUndefined()
        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { scheduleBlockId: "block-1" },
        })
    })

    it("moves the task to anytime without looking up a block", async () => {
        signedIn()
        plannedFor("2026-10-11")

        await assignBlock("task-1", null)

        expect(prismaMock.scheduleBlock.findFirst).not.toHaveBeenCalled()
        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { scheduleBlockId: null },
        })
    })
})