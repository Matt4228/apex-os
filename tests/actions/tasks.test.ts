// tests/actions/tasks.test.ts
import { updateTaskStatus } from "@/app/actions/tasks"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

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

        const result = await updateTaskStatus("task-1", "done")

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { status: "done", completedAt: expect.any(Date) },
        })
    })

    it("clears completedAt when moving a task back out of done", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } }  as never)

        const result = await updateTaskStatus("task-1", "todo")

        expect(prismaMock.task.update).toHaveBeenCalledWith({
            where: { id: "task-1", userId: "user-1" },
            data: { status: "todo", completedAt: null },
        })
    })
})