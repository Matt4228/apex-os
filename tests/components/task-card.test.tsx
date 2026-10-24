// tests/components/task-card.test.tsx
// @vitest-environment jsdom
import TaskCard from "@/components/tasks/TaskCard"
import { updateTask } from "@/app/actions/tasks"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/tasks", () => ({ updateTask: vi.fn() }))

type Task = ComponentProps<typeof TaskCard>["task"]

const task: Task = {
    id: "task-1",
    title: "Submit report",
    status: "todo",
    priority: "medium",
    dueDate: parseDateOnly("2026-10-15"),
    completedAt: null,
    createdAt: new Date("2026-10-01"),
}

function renderCard(overrides: Partial<Task> = {}, goals?: { id: string; title: string }[]) {
    return render(
        <TaskCard
            task={{ ...task, ...overrides }}
            goals={goals}
            onToggle={vi.fn()}
            onDelete={vi.fn()}
            onUpdate={vi.fn()}
            today="2026-10-14"
        />
    )
}

describe("TaskCard due date", () => {
    it("shows an open task past its due date in red", () => {
        renderCard({ dueDate: parseDateOnly("2026-10-13") })
        expect(screen.getByText("Due Oct 13")).toHaveClass("text-danger-ink")
    })

    it("keeps the date grey when the task is done or not yet due", () => {
        renderCard({ dueDate: parseDateOnly("2026-10-13"), status: "done" })
        expect(screen.getByText("Due Oct 13")).not.toHaveClass("text-danger-ink")

        renderCard({ dueDate: parseDateOnly("2026-10-14") })
        expect(screen.getByText("Due Oct 14")).not.toHaveClass("text-danger-ink")
    })

    it("shows the saved calendar day", () => {
        renderCard()
        expect(screen.getByText("Due Oct 15")).toBeInTheDocument()
    })

    it("pre-fills the edit form with the same day, so saving doesn't drift", async () => {
        const user = userEvent.setup()
        renderCard()

        await user.click(screen.getByRole("button", { name: "Edit" }))

        expect(screen.getByDisplayValue("2026-10-15")).toBeInTheDocument()
    })
})

describe("TaskCard goal", () => {
    it("links to the goal the task belongs to", () => {
        renderCard({ goalId: "goal-1", goal: { id: "goal-1", title: "Get a SWE job" } })

        expect(screen.getByRole("link", { name: "Get a SWE job" })).toHaveAttribute("href", "/dashboard/goals/goal-1")
    })

    it("shows no goal link for a standalone task", () => {
        renderCard()

        expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })

    it("keeps a goal that is no longer active selected when editing", async () => {
        const user = userEvent.setup()
        renderCard({ goalId: "old", goal: { id: "old", title: "Finished goal" } }, [{ id: "g1", title: "Active goal"}])

        await user.click(screen.getByRole("button", { name: "Edit" }))

        expect(screen.getByRole("combobox", { name: "Goal" })).toHaveValue("old")
    })

    it("explains why a save failed and stays in edit mode", async () => {
        const user = userEvent.setup()
        vi.mocked(updateTask).mockResolvedValue({ error: "Goal not found" })
        renderCard()

        await user.click(screen.getByRole("button", { name: "Edit" }))
        await user.click(screen.getByRole("button", { name: "Save" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Goal not found")
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    })
})