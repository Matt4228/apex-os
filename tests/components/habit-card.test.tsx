// tests/components/habit-card.test.tsx
// @vitest-environment jsdom
import HabitCard from "@/components/habits/HabitCard"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import { format } from "date-fns"
import { describe, expect, it, vi } from "vitest"

describe("HabitCard check-ins", () => {
    it("shows a check-in stored at midnight UTC on the right local day", () => {
        const today = new Date()
        render(
            <HabitCard 
                habit={{
                    id: "habit-1",
                    title: "Read",
                    category: null,
                    frequency: "daily",
                    targetPerWeek: 7,
                    isActive: true,
                    logs: [{ id: "log-1", completedOn: parseDateOnly(format(today, "yyyy-MM-dd")) }],
                }}
                onDelete={vi.fn()}
                onLogToggle={vi.fn()}
            />
        )

        expect(screen.getByRole("button", { name: format(today, "EEEE, MMM d") })).toHaveAttribute(
            "aria-pressed",
            "true"
        )
    })
})