// tests/components/race-grid.test.tsx
// @vitest-environment jsdom
import RaceGrid from "@/components/competitions/RaceGrid"
import { weekProgress } from "@/lib/competition"
import { raceProgress, type Standing } from "@/lib/standings"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Week 4 of a run club: 22 km and 4 workouts
const metrics = [{ id: "km", name: "km run", unit: "km" }, { id: "wo", name: "Workouts", unit: null }]
const targets = [{ metricId: "km", week: 4, target: 22 }, { metricId: "wo", week: 4, target: 4 }]

function person(name: string, km: number, wo: number, place: number, isYou = false): Standing {
    const week = weekProgress(metrics, targets, [{ metricId: "km", week: 4, amount: km }, { metricId: "wo", week: 4, amount: wo }], 4)
    return {
        participantId: name, userId: name, name, initials: name.slice(0, 2).toUpperCase(), isYou, place, week, race: raceProgress(week),
        season: { completedWeeks: 0, totalProgress: 0, weeks: [] },
    }
}

const renderGrid = (standings: Standing[]) => render(<RaceGrid metrics={metrics} targets={targets} week={4} standings={standings} />)
const rowNames = () => screen.getAllByRole("row").slice(1).map(r => r.getAttribute("aria-label"))
const club = () => [person("Me Too", 14.3, 2, 2, true), person("Sam Chen", 8, 1, 1), person("Alex Rivera", 19.6, 4, 3)]

describe("RaceGrid", () => {
    it("ranks people by this week's progress, you included", () => {
        renderGrid(club())

        expect(rowNames()).toEqual(["1 Alex", "2 You", "3 Sam"])
        expect(screen.getByRole("row", { name: "2 You" })).toHaveAttribute("data-you")
    })

    it("shows each goal's amount and a check when it's done", () => {
        renderGrid(club())

        expect(screen.getByRole("columnheader", { name: "km run / 22" })).toBeInTheDocument()
        expect(screen.getByRole("columnheader", { name: "Workouts / 4" })).toBeInTheDocument()
        const alex = within(screen.getByRole("row", { name: "1 Alex" }))
        expect(alex.getByText("4 of 4")).toBeInTheDocument()
        expect(alex.getByRole("img", { name: "Done" })).toBeInTheDocument()
        expect(within(screen.getByRole("row", { name: "2 You" })).getByText("14.3 km")).toBeInTheDocument()
    })

    it("keeps a long name from widening the table", () => {
        renderGrid([person("Bartholomewthelongestnameyet", 10, 1, 1, true), person("Maximilianowithanunbrokenname", 5, 1, 2)])

        expect(screen.getByText("Maximilianowithanunbrokenname")).toHaveClass("truncate", "max-w-28")
    })

    it("caps the week at 100", () => {
        renderGrid([person("Me Too", 66, 0, 1, true)])

        expect(within(screen.getByRole("row", { name: "1 You" })).getByText("50%")).toBeInTheDocument()
    })

    it("nudges with what's left and the gaps", () => {
        renderGrid(club())

        expect(screen.getByText("7.7 km and 2 workouts to finish the week. Alex is 37 points ahead; Sam is 27 behind.")).toBeInTheDocument()
    })

    it("says when you lead, and when your week is done", () => {
        const { unmount } = renderGrid([person("Me Too", 17.6, 3, 1, true), person("Alex Rivera", 13.2, 2.84, 2)])
        expect(screen.getByText("4.4 km and 1 workout to finish the week. You lead Alex by 12 points.")).toBeInTheDocument()
        unmount()

        renderGrid([person("Me Too", 22, 4, 1, true), person("Alex Rivera", 15, 2.8, 2)])
        expect(screen.getByText(/^Week 4 done\./)).toBeInTheDocument()
    })

    it("says you're level instead of 0 points ahead", () => {
        renderGrid([person("Sam Chen", 11, 2, 1), person("Me Too", 11, 2, 2, true)])

        expect(screen.getByText("11 km and 2 workouts to finish the week. You're level with Sam.")).toBeInTheDocument()
    })
})
