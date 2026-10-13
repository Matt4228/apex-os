// tests/components/category-forms.test.tsx
// @vitest-environment jsdom
import { updateGoal } from "@/app/actions/goals"
import { createHabit } from "@/app/actions/habits"
import GoalEditForm from "@/components/goals/GoalEditForm"
import CreateHabitForm from "@/components/habits/CreateHabitForm"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/goals", () => ({ updateGoal: vi.fn() }))
vi.mock("@/app/actions/habits", () => ({ createHabit: vi.fn() }))

type User = ReturnType<typeof userEvent.setup>

async function pickCategory(user: User, name: string) {
    await user.click(screen.getByRole("combobox", { name: "Category" }))
    await user.click(await screen.findByRole("option", { name }))
}

describe("category picker in the goal and habit forms", () => {
    it("creates a habit with the category picked", async () => {
        const user = userEvent.setup()
        vi.mocked(createHabit).mockResolvedValue({ habit: undefined } as never)
        render(<CreateHabitForm onCreated={() => {}} />)

        await user.click(screen.getByRole("button", { name: "+ Add a habit" }))
        await user.type(screen.getByPlaceholderText("Habit title"), "Stretch")
        await pickCategory(user, "Wellness")
        await user.click(screen.getByRole("button", { name: "Add habit" }))

        await waitFor(() => expect(createHabit).toHaveBeenCalled())
        expect((vi.mocked(createHabit).mock.calls[0][0] as FormData).get("category")).toBe("Wellness")
    })

    it("edits a goal starting from its saved category", async () => {
        const user = userEvent.setup()
        vi.mocked(updateGoal).mockResolvedValue({ goal: undefined } as never)
        const goal = {
            id: "g1",
            title: "Run a half marathon",
            description: null,
            category: "Fitness",
            targetDate: null,
            targetValue: 21.1,
            unit: "km",
            tracking: "best",
        }
        render(<GoalEditForm goal={goal} onSaved={() => {}} onCancel={() => {}} />)

        expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("Fitness")
        await pickCategory(user, "Health")
        await user.click(screen.getByRole("button", { name: "Save" }))

        await waitFor(() => expect(updateGoal).toHaveBeenCalled())
        expect((vi.mocked(updateGoal).mock.calls[0][1] as FormData).get("category")).toBe("Health")
    })
})
