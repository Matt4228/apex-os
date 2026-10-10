// tests/components/goal-card.test.tsx
// @vitest-environment jsdom
import GoalCard from "@/components/goals/GoalCard"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"
import { parseDateOnly } from "@/lib/dates"

type Goal = ComponentProps<typeof GoalCard>["goal"]

const baseGoal: Goal = {
    id: "goal-1",
    title: "Complete 200 LeetCode problems",
    description: null,
    category: null,
    status: "active",
    targetDate: null,
    targetValue: 200,
    unit: "problems",
    entries: [],
}

function renderCard(goal = baseGoal) {
    return render(
        <GoalCard 
            goal={goal}
            onDelete={vi.fn()}
            onStatusChange={vi.fn()}
            onEntryLogged={vi.fn()}
            onUpdate={vi.fn()}
        />
    )
}

describe("GoalCard", () => {
    it("shows the most recent entry as progress, regardless of entry order", () => {
        renderCard({
            ...baseGoal,
            entries: [
                { id: "e1", value: 10, note: null, loggedOn: new Date("2026-01-01T12:00:00Z") },
                { id: "e2", value: 50, note: null, loggedOn: new Date("2026-03-01T12:00:00Z") }, 
            ],
        })

        expect(screen.getByText("50 problems")).toBeInTheDocument()
    })

    it("keeps the target value and unit in the endit form", async () => {
        const user = userEvent.setup()
        renderCard()

        await user.click(screen.getByRole("button", { name: "Edit" }))

        expect(screen.getByDisplayValue("200")).toBeInTheDocument()
        expect(screen.getByDisplayValue("problems")).toBeInTheDocument()
    })

    it("shows and edits the target date as the saved calendar day", async () => {
        const user = userEvent.setup()
        renderCard({ ...baseGoal, targetDate: parseDateOnly("2026-12-31") })

        expect(screen.getByText("Due Dec 31, 2026")).toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Edit" }))
        
        expect(screen.getByDisplayValue("2026-12-31")).toBeInTheDocument()
    })
})