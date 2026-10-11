// tests/components/today-board.test.tsx
// @vitest-environment jsdom
import TodayBoard from "@/components/today/TodayBoard"
import { createTask, planTask, updateTaskStatus } from "@/app/actions/tasks"
import { parseDateOnly } from "@/lib/dates"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/tasks", () => ({ createTask: vi.fn(), planTask: vi.fn(), updateTaskStatus: vi.fn() }))

const TODAY = "2026-10-11"

type Options = { status?: string; dueDate?: string; plannedFor?: string; goalId?: string }

const task = (id: string, title: string, o: Options = {}) => ({
    id,
    title,
    status: o.status ?? "todo",
    priority: "medium",
    dueDate: o.dueDate ? parseDateOnly(o.dueDate) : null,
    plannedFor: o.plannedFor ? parseDateOnly(o.plannedFor) : null,
    completedAt: null,
    createdAt: new Date("2026-10-01"),
    goalId: o.goalId ?? null,
    goal: null,
})

const plan = () => screen.getByRole("region", { name: "Today's plan" })
const suggestions = () => screen.getByRole("region", { name: "Add to today" })

describe("TodayBoard", () => {
    beforeEach(() => {
        vi.mocked(createTask).mockReset()
        vi.mocked(planTask).mockReset()
        vi.mocked(updateTaskStatus).mockReset()
    })

    it("moves a suggestion into the plan with + Today", async () => {
        const user = userEvent.setup()
        vi.mocked(planTask).mockResolvedValue(undefined)
        render(<TodayBoard initialTasks={[task("t1", "Pay rent", { dueDate: TODAY })]} goals={[]} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "Add to today: Pay rent" }))

        expect(within(plan()).getByRole("checkbox", { name: "Pay rent" })).toBeInTheDocument()
        expect(within(suggestions()).queryByText("Pay rent")).not.toBeInTheDocument()
        expect(planTask).toHaveBeenCalledWith("t1", true)
    })

    it("puts it back and explains when planning fails", async () => {
        const user = userEvent.setup()
        vi.mocked(planTask).mockResolvedValue({ error: "Unauthorized" })
        render(<TodayBoard initialTasks={[task("t1", "Pay rent", { dueDate: TODAY })]} goals={[]} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "Add to today: Pay rent" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't add that to today")
        expect(within(suggestions()).getByText("Pay rent")).toBeInTheDocument()
    })

    it("moves a planned task that's due today back under Urgent with Not today", async () => {
        const user = userEvent.setup()
        vi.mocked(planTask).mockResolvedValue(undefined)
        render(<TodayBoard initialTasks={[task("t1", "Pay rent", { dueDate: TODAY, plannedFor: TODAY })]} goals={[]} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "Not today: Pay rent" }))

        expect(within(suggestions()).getByText("Pay rent")).toBeInTheDocument()
        expect(planTask).toHaveBeenCalledWith("t1", false)
    })

    it("counts done tasks in the plan as they're checked off", async () => {
        const user = userEvent.setup()
        vi.mocked(updateTaskStatus).mockResolvedValue(undefined)
        render(
            <TodayBoard
                initialTasks={[task("t1", "Email recruiter", { plannedFor: TODAY }), task("t2", "Prep questions", { plannedFor: TODAY })]}
                goals={[]}
                today={TODAY}
            />
        )
        expect(within(plan()).getByText("0 of 2 done")).toBeInTheDocument()

        await user.click(screen.getByRole("checkbox", { name: "Email recruiter" }))

        expect(within(plan()).getByText("1 of 2 done")).toBeInTheDocument()
    })

    it("shows a goal's next step, and the one after once it's planned", async () => {
        const user = userEvent.setup()
        vi.mocked(planTask).mockResolvedValue(undefined)
        const steps = [
            task("s1", "Add an index", { dueDate: "2026-10-15", goalId: "g1" }),
            task("s2", "Write a post", { dueDate: "2026-10-20", goalId: "g1" }),
        ]
        render(<TodayBoard initialTasks={steps} goals={[{ id: "g1", title: "Postgres performance", status: "active" }]} today={TODAY} />)
        expect(within(suggestions()).getByText("Add an index")).toBeInTheDocument()
        expect(within(suggestions()).queryByText("Write a post")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Add to today: Add an index" }))

        expect(within(suggestions()).getByText("Write a post")).toBeInTheDocument()
    })

    it("adds a new task straight into today's plan", async () => {
        const user = userEvent.setup()
        vi.mocked(createTask).mockResolvedValue({ task: task("n1", "Call the bank", { plannedFor: TODAY }) } as never)
        render(<TodayBoard initialTasks={[]} goals={[]} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "+ Add a task for today" }))
        await user.type(screen.getByPlaceholderText("Task title"), "Call the bank")
        await user.click(screen.getByRole("button", { name: "Add task for today" }))

        expect(await within(plan()).findByRole("checkbox", { name: "Call the bank" })).toBeInTheDocument()
        expect(vi.mocked(createTask).mock.calls[0][0].get("plannedFor")).toBe("today")
    })

    it("prompts to plan when nothing is planned and nothing is waiting", () => {
        render(<TodayBoard initialTasks={[]} goals={[]} today={TODAY} />)

        expect(screen.getByText("Nothing planned yet. Pick from the suggestions below, or add a task.")).toBeInTheDocument()
        expect(screen.getByText("Nothing else waiting.")).toBeInTheDocument()
    })
})