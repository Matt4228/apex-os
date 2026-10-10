// tests/components/task-card.test.tsx
// @vitest-environment jsdom
import TaskCard from "@/components/tasks/TaskCard"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

type Task = ComponentProps<typeof TaskCard>["task"]

const task: Task = {
    id: "task-1",
    title: "Submit report",
    status: "todo",
    priority: "medium",
    dueDate: parseDateOnly("2026-10-15"),
    completedAt: null,
}

function renderCard() {
    return render(
        <TaskCard task={task} onToggle={vi.fn()} onDelete={vi.fn()} onUpdate={vi.fn()} isPending={false} />
    )
}

describe("TaskCard due date", () => {
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