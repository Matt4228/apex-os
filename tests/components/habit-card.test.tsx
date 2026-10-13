// tests/components/habit-card.test.tsx
// @vitest-environment jsdom
import HabitCard from "@/components/habits/HabitCard"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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
