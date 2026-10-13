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

    it("shows how far along each block's tasks are", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 8, 0))
        render(<TodaySchedule blocks={blocks} progress={{ b2: { done: 1, total: 2 }, b3: { done: 1, total: 1 } }} />)

        expect(within(screen.getByText("Deep work").closest("li")!).getByText("1 of 2 done")).toBeInTheDocument()
        expect(within(screen.getByText("Meetings").closest("li")!).getByText("1 of 1 done")).toBeInTheDocument()
        expect(screen.getByText("Morning run").closest("li")).not.toHaveTextContent(/done/)
    })

    it("tints each block with its category, and leaves one without a category neutral", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 8, 0))
        render(<TodaySchedule blocks={[{ ...blocks[0], category: "Fitness" }, blocks[1]]} />)

        expect(screen.getByText("Morning run").closest("li")).toHaveAttribute("data-cat", "0")
        expect(screen.getByText("Deep work").closest("li")).not.toHaveAttribute("data-cat")
    })

    it("shows when each block starts and ends", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 8, 0))
        render(<TodaySchedule blocks={blocks} />)

        expect(screen.getByText("Deep work").closest("li")).toHaveTextContent("09:00 to 12:00")
    })
})