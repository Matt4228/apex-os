// tests/components/goal-progress-panel.test.tsx
// @vitest-environment jsdom
import GoalProgressPanel from "@/components/goals/GoalProgressPanel"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/goals", () => ({ logGoalEntry: vi.fn() }))

type Props = ComponentProps<typeof GoalProgressPanel>

const goal: Props["goal"] = {
    id: "goal-1",
    title: "Get a SWE job",
    status: "active",
    targetValue: null,
    unit: null,
    entries: [],
}

const step = (id: string, title: string, status: string, dueDate: string | null) => ({
    id,
    title,
    status,
    dueDate: dueDate ? parseDateOnly(dueDate) : null,
    createdAt: new Date("2026-10-01"),
})

function renderPanel(props: Partial<Props> = {}) {
    const onComplete = vi.fn()
    render(<GoalProgressPanel goal={goal} steps={[]} onEntryLogged={vi.fn()} onComplete={onComplete} {...props} />)
    return { onComplete }
}

describe("GoalProgressPanel", () => {
    it("shows steps done and the next step", () => {
        renderPanel({
            steps: [
                step("1", "Update resume", "done", null),
                step("2", "Apply to 10 companies", "todo", "2026-10-15"),
                step("3", "Mock interview", "todo", null),
            ],
        })

        expect(screen.getByText("1 of 3 steps")).toBeInTheDocument()
        expect(screen.getByText("Apply to 10 companies")).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: "Mark complete" })).not.toBeInTheDocument()
    })

    it("offers to complete the goal once every step is done", async () => {
        const user = userEvent.setup()
        const { onComplete } = renderPanel({ steps: [step("1", "Update resume", "done", null)] })

        await user.click(screen.getByRole("button", { name: "Mark complete" }))

        expect(onComplete).toHaveBeenCalled()
    })

    it("doesn't offer it for a goal that is already complete", () => {
        renderPanel({ goal: { ...goal, status: "complete" }, steps: [step("1", "Update resume", "done", null)] })

        expect(screen.queryByRole("button", { name: "Mark complete" })).not.toBeInTheDocument()
    })

    it("shows the logged value and a log form for a numeric goal", () => {
        renderPanel({
            goal: {
                ...goal,
                targetValue: 200,
                unit: "problems",
                entries: [{ id: "e1", value: 50, note: null, loggedOn: new Date("2026-10-01T12:00:00Z") }],
            },
        })

        expect(screen.getByText("50 problems")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Value (problems)")).toBeInTheDocument()
    })
})