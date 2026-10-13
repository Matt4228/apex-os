// tests/components/week-nav.test.tsx
// @vitest-environment jsdom
import WeekNav from "@/components/schedule/WeekNav"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

describe("WeekNav", () => {
    beforeEach(() => {
        push.mockReset()
    })

    it("shows the week's dates and links to the weeks either side", () => {
        render(<WeekNav sunday="2026-10-11" today="2026-10-14" />)

        expect(screen.getByRole("heading", { name: "Oct 11 to Oct 17, 2026" })).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Previous week" })).toHaveAttribute("href", "/dashboard/schedule?week=2026-10-04")
        expect(screen.getByRole("link", { name: "Next week" })).toHaveAttribute("href", "/dashboard/schedule?week=2026-10-18")
    })

    it("crosses a year", () => {
        render(<WeekNav sunday="2026-12-27" today="2026-10-14" />)

        expect(screen.getByRole("heading", { name: "Dec 27 to Jan 2, 2027" })).toBeInTheDocument()
        expect(screen.getByRole("link", { name: "Next week" })).toHaveAttribute("href", "/dashboard/schedule?week=2027-01-03")
    })

    it("marks Today when this week is showing, and links back to it from other weeks", () => {
        const { rerender } = render(<WeekNav sunday="2026-10-11" today="2026-10-14" />)
        expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "date")

        rerender(<WeekNav sunday="2026-11-01" today="2026-10-14" />)
        expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current")
        expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "/dashboard/schedule")
    })

    it("jumps to the week holding the picked date", () => {
        render(<WeekNav sunday="2026-10-11" today="2026-10-14" />)

        fireEvent.change(screen.getByLabelText("Jump to date"), { target: { value: "2027-03-17" } })

        expect(push).toHaveBeenCalledWith("/dashboard/schedule?week=2027-03-17")
    })
})
