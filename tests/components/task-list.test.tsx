// tests/components/task-list.test.tsx
// @vitest-environment jsdom
import TaskList from "@/components/tasks/TaskList"
import { createTask, deleteTask, updateTaskStatus } from "@/app/actions/tasks"
import { parseDateOnly } from "@/lib/dates"
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
    createdAt: new Date("2026-10-01")
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

describe("TaskList on a goal's page", () => {
    const step = (id: string, title: string, dueDate: string | null) => ({
        id,
        title,
        status: "todo",
        priority: "medium",
        dueDate: dueDate ? parseDateOnly(dueDate) : null,
        completedAt: null,
        createdAt: new Date("2026-10-01"),
        goalId: "goal-1",
    })

    beforeEach(() => {
        vi.mocked(createTask).mockReset()
        vi.mocked(updateTaskStatus).mockReset()
    })

    it("creates new tasks as steps of the goal and keeps deadline order", async () => {
        const user = userEvent.setup()
        vi.mocked(createTask).mockResolvedValue({ task: step("s2", "Update resume", "2026-10-10") } as never)
        render(<TaskList initialTasks={[step("s1", "Apply to 10 companies", "2026-10-20")]} goalId="goal-1" />)

        await user.click(screen.getByRole("button", { name: "+ Add a step" }))
        await user.type(screen.getByPlaceholderText("Step title"), "Update resume")
        await user.click(screen.getByRole("button", { name: "Add step" }))
        await screen.findByRole("checkbox", { name: "Update resume" })

        expect(vi.mocked(createTask).mock.calls[0][0].get("goalId")).toBe("goal-1")
        const order = screen.getAllByRole("checkbox").map(c => c.getAttribute("aria-label"))
        expect(order).toEqual(["Update resume", "Apply to 10 companies"])
    })

    it("gives the header the current tasks, so it updates when one is checked", async () => {
        const user = userEvent.setup()
        vi.mocked(updateTaskStatus).mockResolvedValue(undefined)
        render(
            <TaskList
                initialTasks={[step("s1", "Apply to 10 companies", null)]}
                goalId="goal-1"
                header={tasks => <p>{tasks.filter(t => t.status === "done").length} done</p>}
            />
        )
        expect(screen.getByText("0 done")).toBeInTheDocument()

        await user.click(screen.getByRole("checkbox", { name: "Apply to 10 companies" }))

        expect(screen.getByText("1 done")).toBeInTheDocument()
    })
})