// tests/components/habit-card.test.tsx
// @vitest-environment jsdom
import { toggleHabitLog } from "@/app/actions/habits"
import HabitCard from "@/components/habits/HabitCard"
import HabitList from "@/components/habits/HabitList"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/habits", () => ({
    createHabit: vi.fn(),
    deleteHabit: vi.fn(),
    toggleHabitActive: vi.fn(),
    toggleHabitLog: vi.fn(),
    updateHabit: vi.fn(),
}))

const habit = {
    id: "habit-1",
    title: "Read",
    category: null,
    frequency: "daily",
    targetPerWeek: 7,
    isActive: true,
    logs: [{ id: "log-1", completedOn: parseDateOnly("2026-10-14") }],
}

// The user's today comes from the server, so the card never reads the machine's clock
const renderCard = (today: string) =>
    render(<HabitCard habit={habit} onDelete={vi.fn()} onLogToggle={vi.fn()} today={today} />)

describe("HabitCard week", () => {
    it("shows a check-in stored at midnight UTC on its own day", () => {
        renderCard("2026-10-14")

        expect(screen.getByRole("button", { name: "Wednesday, Oct 14" })).toHaveAttribute("aria-pressed", "true")
    })

    it("draws the Sunday to Saturday week around the user's today", () => {
        renderCard("2026-10-14")

        expect(screen.getByRole("button", { name: "Sunday, Oct 11" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Saturday, Oct 17" })).toBeInTheDocument()
    })

    it("can't log days after the user's today", () => {
        renderCard("2026-10-14")

        expect(screen.getByRole("button", { name: "Thursday, Oct 15" })).toBeDisabled()
        expect(screen.getByRole("button", { name: "Wednesday, Oct 14" })).toBeEnabled()
    })
})

describe("HabitCard history", () => {
    const logs = (...days: string[]) => days.map((day, i) => ({ id: `log-${i}`, completedOn: parseDateOnly(day) }))
    const card = (frequency: string) => ({
        ...habit,
        category: "Fitness",
        frequency,
        logs: logs("2026-10-12", "2026-10-13", "2026-10-14"),
    })

    it("shows twelve weeks of days, colored by the habit's category", () => {
        render(<HabitCard habit={card("daily")} onDelete={vi.fn()} onLogToggle={vi.fn()} today="2026-10-14" />)

        expect(screen.getByTestId("heatmap").children).toHaveLength(84)
        expect(screen.getByText("Fitness").closest("[data-cat]")).toHaveAttribute("data-cat", "0")
        expect(screen.getByRole("button", { name: "Wednesday, Oct 14" }).className).toContain("bg-cat-solid")
    })

    it("counts a daily habit's streak", () => {
        render(<HabitCard habit={card("daily")} onDelete={vi.fn()} onLogToggle={vi.fn()} today="2026-10-14" />)

        expect(screen.getByText("3 day streak")).toBeInTheDocument()
    })

    it("shows no day streak for a weekly habit", () => {
        render(<HabitCard habit={card("weekly")} onDelete={vi.fn()} onLogToggle={vi.fn()} today="2026-10-14" />)

        expect(screen.queryByText(/day streak/)).not.toBeInTheDocument()
    })
})

describe("HabitCard check-ins", () => {
    const day = () => screen.getByRole("button", { name: "Tuesday, Oct 13" })

    beforeEach(() => {
        vi.mocked(toggleHabitLog).mockReset()
    })

    it("fills the day in before the server answers", async () => {
        const user = userEvent.setup()
        // A save that never finishes: anything on screen came from the click alone
        vi.mocked(toggleHabitLog).mockReturnValue(new Promise(() => {}))
        render(<HabitList initialHabits={[habit]} today="2026-10-14" />)

        await user.click(day())

        expect(day()).toHaveAttribute("aria-pressed", "true")
        expect(toggleHabitLog).toHaveBeenCalledWith("habit-1", "2026-10-13")
    })

    it("empties the day again and explains when saving fails", async () => {
        const user = userEvent.setup()
        vi.mocked(toggleHabitLog).mockResolvedValue({ error: "Unauthorized" })
        render(<HabitList initialHabits={[habit]} today="2026-10-14" />)

        await user.click(day())

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't update that habit. Your session has ended.")
        expect(day()).toHaveAttribute("aria-pressed", "false")
    })

    it("refills a day it failed to clear", async () => {
        const user = userEvent.setup()
        vi.mocked(toggleHabitLog).mockRejectedValue(new TypeError("Failed to fetch"))
        const logged = { ...habit, logs: [{ id: "log-1", completedOn: parseDateOnly("2026-10-13") }] }
        render(<HabitList initialHabits={[logged]} today="2026-10-14" />)

        await user.click(day())

        expect(await screen.findByRole("alert")).toHaveTextContent("Check your connection")
        expect(day()).toHaveAttribute("aria-pressed", "true")
    })
})
