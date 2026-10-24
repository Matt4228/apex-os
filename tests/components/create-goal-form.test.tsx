// tests/components/create-goal-form.test.tsx
// @vitest-environment jsdom
import { createGoal } from "@/app/actions/goals"
import CreateGoalForm from "@/components/goals/CreateGoalForm"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/goals", () => ({ createGoal: vi.fn() }))

const MORE = "+ Add a target, date or description"

async function openForm() {
    const user = userEvent.setup()
    render(<CreateGoalForm onCreated={vi.fn()} />)
    await user.click(screen.getByRole("button", { name: "+ Add a goal" }))
    return user
}

describe("CreateGoalForm", () => {
    beforeEach(() => {
        vi.mocked(createGoal).mockReset()
    })

    it("starts with just the title and category", async () => {
        await openForm()

        expect(screen.getByPlaceholderText("Goal title")).toBeVisible()
        expect(screen.getByRole("combobox", { name: "Category" })).toBeVisible()
        expect(screen.getByPlaceholderText("Description (optional)")).not.toBeVisible()
        expect(screen.getByPlaceholderText("Target value (optional)")).not.toBeVisible()
        expect(screen.getByLabelText("Target date")).not.toBeVisible()
    })

    it("shows the other fields when asked", async () => {
        const user = await openForm()

        await user.click(screen.getByRole("button", { name: MORE }))

        expect(screen.getByPlaceholderText("Description (optional)")).toBeVisible()
        expect(screen.getByPlaceholderText("Target value (optional)")).toBeVisible()
        expect(screen.getByLabelText("Target date")).toBeVisible()
        expect(screen.queryByRole("button", { name: MORE })).not.toBeInTheDocument()
    })

    // The fields are hidden, not removed, so the tracking choice still goes with the form
    it("still sends the default tracking while the fields are hidden", async () => {
        const user = await openForm()
        vi.mocked(createGoal).mockResolvedValue({ goal: undefined } as never)

        await user.type(screen.getByPlaceholderText("Goal title"), "Run a marathon")
        await user.click(screen.getByRole("button", { name: "Add goal" }))

        await waitFor(() => expect(createGoal).toHaveBeenCalled())
        expect((vi.mocked(createGoal).mock.calls[0][0] as FormData).get("tracking")).toBe("latest")
    })
})
