// tests/components/empty-states.test.tsx
// @vitest-environment jsdom
import CompetitionList from "@/components/competitions/CompetitionList"
import GoalList from "@/components/goals/GoalList"
import HabitList from "@/components/habits/HabitList"
import TaskList from "@/components/tasks/TaskList"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

const pages = [
    { name: "Tasks", page: <TaskList initialTasks={[]} />, button: "Create your first task", field: "Task title" },
    { name: "Goals", page: <GoalList initialGoals={[]} />, button: "Create your first goal", field: "Goal title" },
    { name: "Habits", page: <HabitList initialHabits={[]} today="2026-10-12" />, button: "Create your first habit", field: "Habit title" },
    {
        name: "Competitions",
        page: <CompetitionList initialCompetitions={[]} />,
        button: "Create your first competition",
        field: "Competition title e.g. Race to Witch Mountain",
    },
]

describe.each(pages)("$name with nothing in it", ({ page, button, field }) => {
    it("says what the page is for, and its button opens the create form", async () => {
        const user = userEvent.setup()
        render(page)

        expect(screen.getByRole("heading", { name: /yet$/ })).toBeInTheDocument()
        // The icon sits in a brand purple circle
        expect(screen.getByTestId("empty-icon").className).toContain("bg-primary-tint")

        await user.click(screen.getByRole("button", { name: button }))

        expect(screen.getByPlaceholderText(field)).toHaveFocus()
    })

    it("comes back if the form is cancelled", async () => {
        const user = userEvent.setup()
        render(page)

        await user.click(screen.getByRole("button", { name: button }))
        await user.click(screen.getByRole("button", { name: "Cancel" }))

        expect(screen.getByRole("button", { name: button })).toBeInTheDocument()
    })
})

describe("empty states only show on an empty page", () => {
    it("keeps the small add button once there is something in the list", () => {
        render(
            <TaskList
                initialTasks={[{ id: "t1", title: "Write tests", status: "done", priority: "low", dueDate: null, completedAt: null, createdAt: new Date() }]}
            />
        )

        expect(screen.queryByRole("button", { name: "Create your first task" })).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "+ Add a task" })).toBeInTheDocument()
    })

    it("leaves a goal's empty step list alone", () => {
        render(<TaskList initialTasks={[]} goalId="goal-1" />)

        expect(screen.getByRole("button", { name: "+ Add a step" })).toBeInTheDocument()
    })
})
