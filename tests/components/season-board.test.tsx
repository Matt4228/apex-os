// tests/components/season-board.test.tsx
// @vitest-environment jsdom
import SeasonBoard from "@/components/competitions/SeasonBoard"
import type { WeekState } from "@/lib/competition"
import type { Standing } from "@/lib/standings"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

const row = (name: string, place: number, weeks: WeekState[], totalProgress: number, isYou = false): Standing => ({
    participantId: name, userId: name, name, initials: name.slice(0, 2).toUpperCase(), isYou, place, race: 0, week: null,
    season: { completedWeeks: weeks.filter(w => w === "complete").length, totalProgress, weeks },
})
const later = (n: number): WeekState[] => Array(n).fill("ahead")
const club = [
    row("Sam Chen", 1, ["complete", "complete", "complete", "current", ...later(4)], 341),
    row("Me Too", 2, ["complete", "complete", "complete", "current", ...later(4)], 318, true),
    row("Alex Rivera", 3, ["complete", "missed", "complete", "current", ...later(4)], 296),
]
const rows = () => screen.getAllByRole("listitem")

describe("SeasonBoard", () => {
    it("ranks everyone by completed weeks, then total", () => {
        render(<SeasonBoard weeks={8} standings={club} />)

        expect(rows().map(r => r.getAttribute("aria-label"))).toEqual(["1 Sam", "2 You", "3 Alex"])
        const sam = within(rows()[0])
        expect(sam.getByText("3 / 8")).toBeInTheDocument()
        expect(sam.getByText("341% total")).toBeInTheDocument()
        expect(rows()[1]).toHaveAttribute("data-you")
    })

    it("shows each person's weeks", () => {
        render(<SeasonBoard weeks={8} standings={club} />)

        expect(within(rows()[2]).getByRole("img", { name: "Week 2: missed" })).toBeInTheDocument()
    })

    it("wraps a long season in rows of 13", () => {
        render(<SeasonBoard weeks={52} standings={[row("Me Too", 1, ["complete", "current", ...later(50)], 100, true), row("Sam Chen", 2, ["missed", "current", ...later(50)], 20)]} />)

        expect(within(rows()[0]).getAllByTestId("week-row")).toHaveLength(4)
        expect(within(rows()[1]).getAllByTestId("week-row")).toHaveLength(4)
    })
})
