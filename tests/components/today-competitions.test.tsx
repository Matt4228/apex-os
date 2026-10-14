// tests/components/today-competitions.test.tsx
// @vitest-environment jsdom
import TodayCompetitions from "@/components/today/TodayCompetitions"
import { season, type Position } from "@/lib/competition"
import type { CompetitionView } from "@/lib/competitionData"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Run Club, week 2 of 4 (Oct 11 to 17): 9 of 12 km and 1 of 2 workouts so far
function view(o: Partial<CompetitionView> & { position?: Position } = {}): CompetitionView {
    const position: Position = o.position ?? { state: "active", week: 2 }
    const metrics = [{ id: "km", name: "km run", unit: "km" }, { id: "wo", name: "Workouts", unit: null }]
    const targets = [
        ...[10, 12, 14, 16].map((target, i) => ({ metricId: "km", week: i + 1, target })),
        ...[2, 2, 3, 3].map((target, i) => ({ metricId: "wo", week: i + 1, target })),
    ]
    const logs = [
        { id: "a", metricId: "km", week: 2, amount: 9, note: null, createdAt: new Date() },
        { id: "b", metricId: "wo", week: 2, amount: 1, note: null, createdAt: new Date() },
    ]
    const base = { id: "run", title: "Run Club", category: "Fitness", startDate: "2026-10-04", weeks: 4, isOwner: true, position, metrics, targets, logs, people: [], invited: [], joinCode: null, ...o }
    return { ...base, season: season(base.metrics, base.targets, base.logs, base, position) }
}

describe("TodayCompetitions", () => {
    it("shows each running competition's week, days left and what's left to finish it", () => {
        render(<TodayCompetitions competitions={[view()]} today="2026-10-14" />)

        const row = screen.getByRole("listitem")
        expect(within(row).getByRole("link", { name: "Run Club" })).toHaveAttribute("href", "/dashboard/competitions/run")
        expect(within(row).getByText("Week 2 of 4 · 4 days left")).toBeInTheDocument()
        expect(within(row).getByText("3 km, 1 workout to go")).toBeInTheDocument()
        expect(within(row).getByRole("progressbar", { name: "Run Club this week" })).toHaveAttribute("aria-valuenow", "63")
        expect(within(row).getByRole("link", { name: "Log progress for Run Club" })).toBeInTheDocument()
    })

    it("says when this week is done", () => {
        const done = view({ logs: [
            { id: "a", metricId: "km", week: 2, amount: 12, note: null, createdAt: new Date() },
            { id: "b", metricId: "wo", week: 2, amount: 2, note: null, createdAt: new Date() },
        ] })
        render(<TodayCompetitions competitions={[done]} today="2026-10-14" />)

        expect(screen.getByText("Week complete")).toBeInTheDocument()
    })

    it("leaves out competitions that haven't started or have finished, and shows nothing without a running one", () => {
        const { container, rerender } = render(
            <TodayCompetitions competitions={[view(), view({ id: "later", title: "Later", position: { state: "upcoming" } })]} today="2026-10-14" />
        )
        expect(screen.getAllByRole("listitem")).toHaveLength(1)

        rerender(<TodayCompetitions competitions={[view({ position: { state: "finished" } })]} today="2026-10-14" />)
        expect(container).toBeEmptyDOMElement()
    })
})
