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
    tracking: "latest",
    entries: [],
    tasks: [],
}

const step = (id: string, status: string) => ({
    id,
    title: `Step ${id}`,
    status,
    priority: "medium",
    dueDate: null,
    completedAt: null,
    createdAt: new Date("2026-10-01"),
})

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

        expect(screen.getByText("Now 50 problems")).toBeInTheDocument()
        expect(screen.getByText("Target 200 problems")).toBeInTheDocument()
    })

    it("words a running total and a personal best to match how they add up", () => {
        const entries = [
            { id: "e1", value: 8, note: null, loggedOn: new Date("2026-01-01T12:00:00Z") },
            { id: "e2", value: 5, note: null, loggedOn: new Date("2026-02-01T12:00:00Z") },
        ]
        const { unmount } = renderCard({ ...baseGoal, unit: "km", tracking: "total", entries })
        expect(screen.getByText("13 km so far")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Add progress" })).toBeInTheDocument()
        unmount()

        renderCard({ ...baseGoal, unit: "km", tracking: "best", entries })
        expect(screen.getByText("Best 8 km")).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Log a result" })).toBeInTheDocument()
    })

    it("keeps how numbers add up in the edit form", async () => {
        const user = userEvent.setup()
        renderCard({ ...baseGoal, tracking: "best" })

        await user.click(screen.getByRole("button", { name: "Edit" }))

        expect(screen.getByRole("combobox", { name: "How logged numbers add up" })).toHaveValue("best")
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

    it("links the title to the goal's page", () => {
        renderCard()

        expect(screen.getByRole("link", { name: baseGoal.title })).toHaveAttribute("href", "/dashboard/goals/goal-1")
    })

    it("shows steps progress, and no logging, for a goal with steps", () => {
        renderCard({ ...baseGoal, tasks: [step("1", "done"), step("2", "todo")] })

        expect(screen.getByText("1 of 2 steps")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Update value" })).not.toBeInTheDocument()
    })
})

describe("GoalCard logging", () => {
    it("closes the log form with Cancel or Escape", async () => {
        const user = userEvent.setup()
        renderCard()

        await user.click(screen.getByRole("button", { name: "Update value" }))
        await user.click(screen.getByRole("button", { name: "Cancel" }))
        expect(screen.queryByPlaceholderText("New value (problems)")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Update value" }))
        await user.type(screen.getByPlaceholderText("New value (problems)"), "{Escape}")
        expect(screen.queryByPlaceholderText("New value (problems)")).not.toBeInTheDocument()
    })
})
