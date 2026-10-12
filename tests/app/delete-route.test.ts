// tests/app/delete-route.test.ts
import { DELETE } from "@/app/api/items/[kind]/[id]/route"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/user-today", () => ({ getUserToday: vi.fn(async () => "2026-10-12") }))

function send(kind: string, id: string) {
    const req = new NextRequest(`http://localhost/api/items/${kind}/${id}`, { method: "DELETE" })
    return DELETE(req, { params: Promise.resolve({ kind, id }) })
}

const signedIn = () => mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)

describe("DELETE /api/items/[kind]/[id]", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("refuses without a session and deletes nothing", async () => {
        mockedAuth.mockResolvedValue(null)

        const res = await send("task", "task-1")

        expect(res.status).toBe(401)
        expect(prismaMock.task.delete).not.toHaveBeenCalled()
    })

    it("is not found for a kind it doesn't know", async () => {
        signedIn()

        const res = await send("user", "user-1")

        expect(res.status).toBe(404)
    })

    it("deletes only the signed-in user's row", async () => {
        signedIn()

        const res = await send("task", "task-1")

        expect(res.status).toBe(204)
        expect(prismaMock.task.delete).toHaveBeenCalledWith({ where: { id: "task-1", userId: "user-1" } })
    })

    it("is not found when no row matches (already gone, or another user's)", async () => {
        signedIn()
        prismaMock.goal.delete.mockRejectedValue(new Error("Record to delete does not exist"))

        const res = await send("goal", "goal-9")

        expect(res.status).toBe(404)
    })

    it.each([
        ["goal", "goal"],
        ["habit", "habit"],
        ["schedule-block", "scheduleBlock"],
        ["competition", "competition"],
    ] as const)("deletes a %s", async (kind, model) => {
        signedIn()

        const res = await send(kind, "id-1")

        expect(res.status).toBe(204)
        expect(prismaMock[model].delete).toHaveBeenCalledWith({ where: { id: "id-1", userId: "user-1" } })
    })
})
