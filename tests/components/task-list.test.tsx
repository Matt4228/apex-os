// tests/components/task-list.test.tsx
// @vitest-environment jsdom
import TaskList from "@/components/tasks/TaskList"
import { deleteTask, updateTaskStatus } from "@/app/actions/tasks"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest"
import { UNDO_WINDOW_MS } from "@/lib/use-undoable-delete"

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
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.mocked(deleteTask).mockReset()
        vi.mocked(updateTaskStatus).mockReset()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // userEvent waits between keystrokes; this lets those waits use the fake clock
    const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    it("puts a deleted task back and explains why", async () => {
        const user = setup()
        vi.mocked(deleteTask).mockRejectedValue(new Error("network down"))
        render(<TaskList initialTasks={[task]} />)

        await user.click(screen.getByRole("button", { name: "Delete Write report" }))
        await act(() => vi.advanceTimersByTime(UNDO_WINDOW_MS))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete")
        expect(screen.getByText("Write report")).toBeInTheDocument()
    })

    it("unchecks a task when marking it done fails", async () => {
        const user = setup()
        vi.mocked(updateTaskStatus).mockResolvedValue({ error: "Invalid status" })
        render(<TaskList initialTasks={[task]} />)

        await user.click(screen.getByRole("checkbox", { name: "Write report" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't update")
        expect(screen.getByRole("checkbox", { name: "Write report" })).not.toBeChecked()
    })

    it("hides a deleted task right away, and Undo brings it back without touching the server", async () => {
        const user = setup()
        render(<TaskList initialTasks={[task]} />)

        await user.click(screen.getByRole("button", { name: "Delete Write report" }))
        expect(screen.queryByText("Write report")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Undo" }))
        expect(screen.getByText("Write report")).toBeInTheDocument()

        await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS))
        expect(deleteTask).not.toHaveBeenCalled()
    })

    it("deletes on the server once the undo window closes", async () => {
        const user = setup()
        render(<TaskList initialTasks={[task]} />)

        await user.click(screen.getByRole("button", { name: "Delete Write report" }))
        expect(deleteTask).not.toHaveBeenCalled()

        await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS))
        expect(deleteTask).toHaveBeenCalledWith("task-1")
        expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument()
    })
})