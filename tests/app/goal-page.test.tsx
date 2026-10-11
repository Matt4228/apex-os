// tests/app/goal-page.test.tsx
import GoalPage from "@/app/dashboard/goals/[id]/page"
import { notFound } from "next/navigation"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

// The real ones throw special errors that Next catches; these stand in for them
vi.mock("next/navigation", () => ({
    notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND") }),
    redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT") }),
}))

describe("GoalPage", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("shows a 404 for a goal that isn't the signed-in user's", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
        prismaMock.goal.findFirst.mockResolvedValue(null)

        await expect(GoalPage({ params: Promise.resolve({ id: "goal-2" }) })).rejects.toThrow("NEXT_NOT_FOUND")

        expect(prismaMock.goal.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "goal-2", userId: "user-1" } })
        )
        expect(notFound).toHaveBeenCalled()
    })
})