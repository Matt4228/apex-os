// tests/components/day-strip.test.tsx
// @vitest-environment jsdom
import DayStrip from "@/components/today/DayStrip"
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const blocks = [
    { id: "b1", startTime: "06:00", endTime: "07:00", label: "Morning run", category: "Fitness" },
    { id: "b2", startTime: "09:00", endTime: "12:00", label: "Deep work", category: "Work" },
    { id: "b3", startTime: "17:00", endTime: "18:00", label: "Job search", category: "career" },
    { id: "b4", startTime: "12:00", endTime: "13:00", label: "Lunch", category: null },
]

describe("DayStrip", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("names the span of the day it draws", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 10, 0))
        render(<DayStrip blocks={blocks} />)

        expect(screen.getByRole("img", { name: "Today's schedule, 06:00 to 18:00" })).toBeInTheDocument()
    })

    it("colors each block by its category and lists the categories once", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 10, 0))
        render(<DayStrip blocks={blocks} />)

        expect(screen.getByTitle("09:00 to 12:00 Deep work")).toHaveAttribute("data-cat", "4")
        expect(screen.getByTitle("12:00 to 13:00 Lunch")).not.toHaveAttribute("data-cat")
        const legend = screen.getByRole("list", { name: "Categories" })
        expect(legend).toHaveTextContent("careerFitnessWork")
    })

    it("marks the time now only while it falls inside the day", () => {
        vi.setSystemTime(new Date(2026, 9, 11, 10, 0))
        const { unmount } = render(<DayStrip blocks={blocks} />)
        expect(screen.getByTestId("now-mark")).toBeInTheDocument()
        unmount()

        vi.setSystemTime(new Date(2026, 9, 11, 22, 0))
        render(<DayStrip blocks={blocks} />)
        expect(screen.queryByTestId("now-mark")).not.toBeInTheDocument()
    })

    it("draws nothing on a day with no blocks", () => {
        const { container } = render(<DayStrip blocks={[]} />)

        expect(container).toBeEmptyDOMElement()
    })
})
