// tests/components/task-list.test.tsx
// @vitest-environment jsdom
import TaskList from "@/components/tasks/TaskList"
import { deleteTask, updateTaskStatus } from "@/app/actions/tasks"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/tasks", () => ({
    createTask: vi.fn(),
    updateTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
}))

const task = {
    id: "task-1",
    title: "Write report",
    status: "todo",
    priority: "high",
    dueDate: null,
    completedAt: null,
}

describe("TaskList when the server says no", () => {
    beforeEach(() => {
        vi.mocked(deleteTask).mockReset()
        vi.mocked(updateTaskStatus).mockReset()
    })

    it("puts a deleted task back and explains why", async () => {
        const user = userEvent.setup()
        vi.mocked(deleteTask).mockRejectedValue(new Error("network down"))
        render(<TaskList initialTasks={[task]} />)

        await user.click(screen.getByRole("button", { name: "Delete Write report" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete")
        expect(screen.getByText("Write report")).toBeInTheDocument()
    })

    it("unchecks a task when marking it done fails", async () => {
        const user = userEvent.setup()
        vi.mocked(updateTaskStatus).mockResolvedValue({ error: "Invalid status" })
        render(<TaskList initialTasks={[task]} />)

        await user.click(screen.getByRole("checkbox", { name: "Write report" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't update")
        expect(screen.getByRole("checkbox", { name: "Write report" })).not.toBeChecked()
    })
})