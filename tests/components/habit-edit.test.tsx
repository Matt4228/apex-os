// tests/components/habit-edit.test.tsx
// @vitest-environment jsdom
import { toggleHabitActive, updateHabit } from "@/app/actions/habits"
import HabitCard from "@/components/habits/HabitCard"
import HabitForm from "@/components/habits/HabitForm"
import HabitList from "@/components/habits/HabitList"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/habits", () => ({
    createHabit: vi.fn(),
    deleteHabit: vi.fn(),
    toggleHabitActive: vi.fn(),
    toggleHabitLog: vi.fn(),
    updateHabit: vi.fn(),
}))

const TODAY = "2026-10-14"

const habit = (o: { id?: string; title?: string; isActive?: boolean } = {}) => ({
    id: o.id ?? "h1",
    title: o.title ?? "Read",
    category: "Learning",
    frequency: "weekly",
    targetPerWeek: 3,
    isActive: o.isActive ?? true,
    logs: [],
})

describe("editing a habit", () => {
    beforeEach(() => {
        vi.mocked(updateHabit).mockReset()
    })

    it("opens the form filled in with the habit, and saves the changes", async () => {
        const user = userEvent.setup()
        const onUpdate = vi.fn()
        const saved = { ...habit(), title: "Read 20 pages" }
        vi.mocked(updateHabit).mockResolvedValue({ habit: saved } as never)
        render(<HabitCard habit={habit()} onDelete={vi.fn()} onLogToggle={vi.fn()} onUpdate={onUpdate} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "Edit Read" }))
        const title = screen.getByRole("textbox", { name: "Habit title" })
        expect(title).toHaveValue("Read")
        expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("Learning")
        expect(screen.getByRole("combobox", { name: "How often" })).toHaveValue("weekly")
        expect(screen.getByRole("combobox", { name: "Target per week" })).toHaveValue("3")

        await user.clear(title)
        await user.type(title, "Read 20 pages")
        await user.click(screen.getByRole("button", { name: "Save" }))

        await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("h1", saved))
        expect((vi.mocked(updateHabit).mock.calls[0][1] as FormData).get("title")).toBe("Read 20 pages")
        expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument()
    })

    it("keeps the form open and explains when saving fails", async () => {
        const user = userEvent.setup()
        vi.mocked(updateHabit).mockResolvedValue({ error: "Invalid input" })
        render(<HabitCard habit={habit()} onDelete={vi.fn()} onLogToggle={vi.fn()} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "Edit Read" }))
        await user.click(screen.getByRole("button", { name: "Save" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Invalid input")
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    })
})

describe("HabitForm targets", () => {
    it("offers daily targets for a daily habit and resets the target when switching to weekly", async () => {
        const user = userEvent.setup()
        render(<HabitForm onSaved={vi.fn()} onCancel={vi.fn()} />)

        const target = screen.getByRole("combobox", { name: "Target per week" })
        expect(target).toHaveValue("7")

        await user.selectOptions(screen.getByRole("combobox", { name: "How often" }), "weekly")

        expect(target).toHaveValue("1")
        expect(within(target).getAllByRole("option").map(o => o.textContent)).toEqual([
            "1x per week", "2x per week", "3x per week", "4x per week",
        ])
    })
})

describe("pausing a habit", () => {
    beforeEach(() => {
        vi.mocked(toggleHabitActive).mockReset()
    })

    it("moves it under Paused, with no day buttons, and resumes it", async () => {
        const user = userEvent.setup()
        vi.mocked(toggleHabitActive).mockResolvedValue(undefined)
        render(<HabitList initialHabits={[habit(), habit({ id: "h2", title: "Stretch" })]} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "Pause Read" }))

        expect(toggleHabitActive).toHaveBeenCalledWith("h1", false)
        const paused = screen.getByText("Paused", { selector: "p.uppercase" }).parentElement!
        expect(within(paused).getByText("Read")).toBeInTheDocument()
        expect(within(paused).queryByRole("button", { name: /Wednesday/ })).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Resume Read" }))

        expect(toggleHabitActive).toHaveBeenLastCalledWith("h1", true)
        expect(screen.queryByText("Paused", { selector: "p.uppercase" })).not.toBeInTheDocument()
    })

    it("puts it back and explains when pausing fails", async () => {
        const user = userEvent.setup()
        vi.mocked(toggleHabitActive).mockResolvedValue({ error: "Not found" })
        render(<HabitList initialHabits={[habit()]} today={TODAY} />)

        await user.click(screen.getByRole("button", { name: "Pause Read" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pause that habit. Not found.")
        expect(screen.getByRole("button", { name: "Pause Read" })).toBeInTheDocument()
    })
})
