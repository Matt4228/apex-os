// tests/components/task-list.test.tsx
// @vitest-environment jsdom
import TaskList from "@/components/tasks/TaskList"
import { createTask, deleteTask, updateTask, updateTaskStatus } from "@/app/actions/tasks"
import { parseDateOnly } from "@/lib/dates"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest"
import { UNDO_WINDOW_MS } from "@/lib/use-undoable-delete"
import { HIGHLIGHT_MS } from "@/components/tasks/TaskList"
import { SETTLE_MS } from "@/lib/useSettling"

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
        render(<TaskList today="2026-10-14" initialTasks={[task]} />)

        await user.click(screen.getByRole("button", { name: "Delete Write report" }))
        await act(() => vi.advanceTimersByTime(UNDO_WINDOW_MS))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete")
        expect(screen.getByText("Write report")).toBeInTheDocument()
    })

    it("unchecks a task when marking it done fails", async () => {
        const user = setup()
        vi.mocked(updateTaskStatus).mockResolvedValue({ error: "Invalid status" })
        render(<TaskList today="2026-10-14" initialTasks={[task]} />)

        await user.click(screen.getByRole("checkbox", { name: "Write report" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't update")
        expect(screen.getByRole("checkbox", { name: "Write report" })).not.toBeChecked()
    })

    it("hides a deleted task right away, and Undo brings it back without touching the server", async () => {
        const user = setup()
        render(<TaskList today="2026-10-14" initialTasks={[task]} />)

        await user.click(screen.getByRole("button", { name: "Delete Write report" }))
        expect(screen.queryByText("Write report")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Undo" }))
        expect(screen.getByText("Write report")).toBeInTheDocument()

        await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS))
        expect(deleteTask).not.toHaveBeenCalled()
    })

    it("deletes on the server once the undo window closes", async () => {
        const user = setup()
        render(<TaskList today="2026-10-14" initialTasks={[task]} />)

        await user.click(screen.getByRole("button", { name: "Delete Write report" }))
        expect(deleteTask).not.toHaveBeenCalled()

        await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS))
        expect(deleteTask).toHaveBeenCalledWith("task-1")
        expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument()
    })
})

describe("TaskList checking a task off", () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.mocked(updateTaskStatus).mockReset()
        vi.mocked(updateTaskStatus).mockResolvedValue(undefined as never)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("draws the check in place for a moment, then moves the task to Completed and highlights it there", async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        render(<TaskList today="2026-10-14" initialTasks={[task]} />)

        await user.click(screen.getByRole("checkbox", { name: "Write report" }))

        // Still in the open list, checked, with the strike sweeping through it
        expect(screen.getByRole("checkbox", { name: "Write report" })).toBeChecked()
        expect(screen.queryByText("Completed")).not.toBeInTheDocument()
        expect(screen.getByTestId("strike")).toBeInTheDocument()

        await act(() => vi.advanceTimersByTimeAsync(SETTLE_MS))

        expect(screen.getByText("Completed")).toBeInTheDocument()
        expect(screen.getByText("Write report").closest("[data-highlighted]")).toBeInTheDocument()
        expect(screen.getByRole("status")).toHaveTextContent('Completed "Write report"')
    })
})

describe("TaskList adding and editing", () => {
    const make = (id: string, title: string, priority: string) => ({
        id,
        title,
        status: "todo",
        priority,
        dueDate: null,
        completedAt: null,
        createdAt: new Date("2026-10-01"),
    })
    const order = () => screen.getAllByRole("checkbox").map(c => c.getAttribute("aria-label"))
    const card = (title: string) => screen.getByRole("checkbox", { name: title }).parentElement!

    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.mocked(createTask).mockReset()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    async function addTask(title: string) {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        await user.click(screen.getByRole("button", { name: "+ Add a task" }))
        await user.type(screen.getByPlaceholderText("Task title"), title)
        await user.click(screen.getByRole("button", { name: "Add task" }))
        await screen.findByRole("checkbox", { name: title })
    }

    it("puts a new task where the sort puts it, not at the top", async () => {
        vi.mocked(createTask).mockResolvedValue({ task: { ...make("t3", "Book dentist", "medium"), createdAt: new Date() } } as never)
        render(<TaskList today="2026-10-14" initialTasks={[make("t1", "Ship release", "high"), make("t2", "Tidy desk", "low")]} />)

        await addTask("Book dentist")

        expect(order()).toEqual(["Ship release", "Book dentist", "Tidy desk"])
    })

    it("highlights the new task, announces it, and lets the highlight fade", async () => {
        vi.mocked(createTask).mockResolvedValue({ task: { ...make("t3", "Book dentist", "medium"), createdAt: new Date() } } as never)
        render(<TaskList today="2026-10-14" initialTasks={[make("t1", "Ship release", "high")]} />)

        await addTask("Book dentist")

        expect(card("Book dentist")).toHaveAttribute("data-highlighted")
        expect(card("Ship release")).not.toHaveAttribute("data-highlighted")
        expect(screen.getByRole("status")).toHaveTextContent('Added "Book dentist"')

        await act(() => vi.advanceTimersByTimeAsync(HIGHLIGHT_MS))
        expect(card("Book dentist")).not.toHaveAttribute("data-highlighted")
    })

    it("moves an edited task to its new place and highlights it there", async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        vi.mocked(updateTask).mockResolvedValue(undefined as never)
        render(<TaskList today="2026-10-14" initialTasks={[make("t1", "Ship release", "medium"), make("t2", "Tidy desk", "low")]} />)

        await user.click(within(card("Tidy desk")).getByRole("button", { name: "Edit" }))
        await user.selectOptions(screen.getByDisplayValue("Low priority"), "high")
        await user.click(screen.getByRole("button", { name: "Save" }))

        expect(order()).toEqual(["Tidy desk", "Ship release"])
        expect(card("Tidy desk")).toHaveAttribute("data-highlighted")
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
        render(<TaskList today="2026-10-14" initialTasks={[step("s1", "Apply to 10 companies", "2026-10-20")]} goalId="goal-1" />)

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
            <TaskList today="2026-10-14"
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