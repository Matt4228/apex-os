// tests/actions/tasks.test.ts
import { createTask, updateTask, updateTaskStatus } from "@/app/actions/tasks"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

// revalidatePath needs a Next request context, which tests don't have
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

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