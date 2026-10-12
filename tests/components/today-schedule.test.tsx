// tests/components/today-schedule.test.tsx
// @vitest-environment jsdom
import TodaySchedule from "@/components/today/TodaySchedule"
import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const blocks = [
    { id: "b1", startTime: "06:00", endTime: "07:00", label: "Morning run" },
    { id: "b2", startTime: "09:00", endTime: "12:00", label: "Deep work" },
    { id: "b3", startTime: "13:00", endTime: "17:00", label: "Meetings" },
]

describe("TodaySchedule", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("marks the block happening now", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 10, 30))
        render(<TodaySchedule blocks={blocks} />)

        expect(screen.getByText("Deep work").closest("li")).toHaveAttribute("aria-current", "time")
        expect(screen.getByText("Morning run").closest("li")).not.toHaveAttribute("aria-current")
    })

    it("marks nothing between blocks", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 12, 30))
        render(<TodaySchedule blocks={blocks} />)

        const marked = screen.getAllByRole("listitem").filter(li => li.hasAttribute("aria-current"))
        expect(marked).toHaveLength(0)
    })

    it("shows how many tasks each block holds", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 8, 0))
        render(<TodaySchedule blocks={blocks} counts={{ b2: 2, b3: 1 }} />)

        expect(within(screen.getByText("Deep work").closest("li")!).getByText("2 tasks")).toBeInTheDocument()
        expect(within(screen.getByText("Meetings").closest("li")!).getByText("1 task")).toBeInTheDocument()
        expect(screen.getByText("Morning run").closest("li")).not.toHaveTextContent(/task/)
    })
})