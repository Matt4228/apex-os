// tests/components/schedule-grid.test.tsx
// @vitest-environment jsdom
import ScheduleGrid from "@/components/schedule/ScheduleGrid"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/schedule", () => ({
    createScheduleBlock: vi.fn(),
    deleteScheduleBlock: vi.fn(),
    updateScheduleBlock: vi.fn(),
}))

const DAYS = ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"]

const series = (o: object) => ({
    id: "b1",
    label: "Deep work",
    category: "Work",
    startTime: "09:00",
    endTime: "12:00",
    startDate: parseDateOnly("2026-09-01"),
    repeat: "weekday",
    repeatDays: [],
    endsOn: null,
    endsAfter: null,
    ...o,
})

describe("ScheduleGrid week", () => {
    it("labels each day with its date and circles today", () => {
        render(<ScheduleGrid initialBlocks={[]} days={DAYS} today="2026-10-13" />)

        // The phone day picker lists the week's dates
        expect(screen.getByRole("button", { name: "Tue 13" })).toHaveAttribute("aria-pressed", "true")
        expect(screen.getByRole("button", { name: "Sun 11" })).toHaveAttribute("aria-pressed", "false")
    })

    it("draws a repeating block on each of its days and a one-off on its day only", () => {
        render(
            <ScheduleGrid
                initialBlocks={[series({}), series({ id: "b2", label: "Dentist", repeat: "none", startDate: parseDateOnly("2026-10-15"), startTime: "14:00", endTime: "15:00" })]}
                days={DAYS}
                today="2026-10-13"
            />
        )

        // Desktop columns plus the phone's one column: 5 weekdays + today again on the phone
        expect(screen.getAllByText("Deep work")).toHaveLength(6)
        expect(screen.getAllByText("Dentist")).toHaveLength(1)
    })

    it("applies changed days: a cancelled day disappears, a changed one shows its own times", () => {
        const exceptions = [
            { blockId: "b1", date: parseDateOnly("2026-10-12"), cancelled: true, newDate: null, startTime: null, endTime: null, label: null, category: null },
            { blockId: "b1", date: parseDateOnly("2026-10-14"), cancelled: false, newDate: null, startTime: "10:00", endTime: "11:00", label: null, category: null },
        ]
        render(<ScheduleGrid initialBlocks={[series({})]} initialExceptions={exceptions} days={DAYS} today="2026-10-11" />)

        expect(screen.getAllByText("Deep work")).toHaveLength(4)
        expect(screen.getByText("10:00 - 11:00")).toBeInTheDocument()
    })

    it("doesn't show a block before its start or after its end", () => {
        render(<ScheduleGrid initialBlocks={[series({ startDate: parseDateOnly("2026-10-14"), endsOn: parseDateOnly("2026-10-15") })]} days={DAYS} today="2026-10-11" />)

        // Wednesday and Thursday only, in the desktop columns (the phone shows Sunday, which has none)
        expect(screen.getAllByText("Deep work")).toHaveLength(2)
    })
})

describe("ScheduleGrid zoom", () => {
    afterEach(() => {
        localStorage.clear()
    })

    // A day column is 24 hours tall at the zoom's height per minute
    const columnHeight = () => (document.querySelector("[style*='height']") as HTMLElement).style.height

    it("starts at Comfortable", () => {
        render(<ScheduleGrid initialBlocks={[]} days={DAYS} today="2026-10-13" />)

        expect(screen.getByRole("button", { name: "Comfortable" })).toHaveAttribute("aria-pressed", "true")
        expect(columnHeight()).toBe(`${24 * 60 * 1.2}px`)
    })

    it("changes the scale and remembers it for the next visit", async () => {
        const user = userEvent.setup()
        const { unmount } = render(<ScheduleGrid initialBlocks={[]} days={DAYS} today="2026-10-13" />)

        await user.click(screen.getByRole("button", { name: "Large" }))
        expect(columnHeight()).toBe(`${24 * 60 * 1.8}px`)
        unmount()

        render(<ScheduleGrid initialBlocks={[]} days={DAYS} today="2026-10-13" />)
        expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute("aria-pressed", "true")
    })
})
