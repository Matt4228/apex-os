// tests/components/today-habits.test.tsx
// @vitest-environment jsdom
import TodayHabits from "@/components/today/TodayHabits"
import { toggleHabitLog } from "@/app/actions/habits"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/habits", () => ({ toggleHabitLog: vi.fn() }))

const habits = [{ id: "h1", title: "Read technical content", targetPerWeek: 7, weekCount: 3, doneToday: false }]

describe("TodayHabits", () => {
    beforeEach(() => {
        vi.mocked(toggleHabitLog).mockReset()
    })

    it("checks a habit off for today and counts it toward the week", async () => {
        const user = userEvent.setup()
        vi.mocked(toggleHabitLog).mockResolvedValue({ action: "added", date: "2026-10-11" } as never)
        render(<TodayHabits habits={habits} today="2026-10-11" />)

        await user.click(screen.getByRole("checkbox", { name: "Read technical content" }))

        expect(screen.getByRole("checkbox", { name: "Read technical content" })).toBeChecked()
        expect(screen.getByText("4/7 this week")).toBeInTheDocument()
        expect(toggleHabitLog).toHaveBeenCalledWith("h1", "2026-10-11")
    })

    it("unchecks it again and explains when saving fails", async () => {
        const user = userEvent.setup()
        vi.mocked(toggleHabitLog).mockResolvedValue({ error: "Unauthorized" })
        render(<TodayHabits habits={habits} today="2026-10-11" />)

        await user.click(screen.getByRole("checkbox", { name: "Read technical content" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't update that habit")
        expect(screen.getByRole("checkbox", { name: "Read technical content" })).not.toBeChecked()
        expect(screen.getByText("3/7 this week")).toBeInTheDocument()
    })

    it("colors the check by the habit's category and fills today's square when checked", async () => {
        const user = userEvent.setup()
        vi.mocked(toggleHabitLog).mockResolvedValue({ action: "added", date: "2026-10-14" } as never)
        // 2026-10-14 is a Wednesday: the fourth square
        const week = [true, true, false, false, false, false, false]
        render(<TodayHabits habits={[{ ...habits[0], category: "Learning", weekCount: 2, week }]} today="2026-10-14" />)

        const squares = () => [...screen.getByTestId("week-squares").children]
        expect(screen.getByRole("checkbox", { name: "Read technical content" })).toHaveAttribute("data-cat", "1")
        expect(squares().map(s => s.className.includes("bg-cat-solid"))).toEqual(week)

        await user.click(screen.getByRole("checkbox", { name: "Read technical content" }))

        expect(squares()[3].className).toContain("bg-cat-solid")
        expect(screen.getByText("3/7 this week")).toBeInTheDocument()
    })
})
