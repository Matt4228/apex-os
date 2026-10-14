// tests/components/competitions.test.tsx
// @vitest-environment jsdom
import { createCompetition, deleteLog, logProgress, updateFutureTargets } from "@/app/actions/competitions"
import CompetitionDetail from "@/components/competitions/CompetitionDetail"
import CompetitionForm from "@/components/competitions/CompetitionForm"
import CompetitionList from "@/components/competitions/CompetitionList"
import { season, type Position } from "@/lib/competition"
import type { CompetitionView } from "@/lib/competitionData"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
vi.mock("@/app/actions/competitions", () => ({
    createCompetition: vi.fn(),
    deleteCompetition: vi.fn(),
    deleteLog: vi.fn(),
    logProgress: vi.fn(),
    updateFutureTargets: vi.fn(),
}))

// A 4-week run club in its second week: week 1 done, this week 9 of 12 km
const metrics = [{ id: "km", name: "km run", unit: "km" }]
const targets = [1, 2, 3, 4].map(week => ({ metricId: "km", week, target: [10, 12, 14, 16][week - 1] }))
const logs = [
    { id: "a", metricId: "km", week: 2, amount: 9, note: "Tempo", createdAt: new Date("2026-10-13") },
    { id: "b", metricId: "km", week: 1, amount: 11, note: null, createdAt: new Date("2026-10-08") },
]
function view(o: Partial<CompetitionView> = {}): CompetitionView {
    const position: Position = o.position ?? { state: "active", week: 2 }
    const base = { id: "run", title: "Run Club", category: "Fitness", startDate: "2026-10-04", weeks: 4, isOwner: true, position, metrics, targets, logs }
    const merged = { ...base, ...o }
    return { ...merged, season: season(merged.metrics, merged.targets, merged.logs, merged, position) }
}

beforeEach(() => {
    push.mockReset()
    vi.mocked(createCompetition).mockReset()
    vi.mocked(logProgress).mockReset()
    vi.mocked(deleteLog).mockReset()
    vi.mocked(updateFutureTargets).mockReset()
})

describe("CompetitionList", () => {
    it("groups competitions by whether they're running, coming up or finished", () => {
        render(
            <CompetitionList
                competitions={[
                    view(),
                    view({ id: "soon", title: "Reading", position: { state: "upcoming" } }),
                    view({ id: "done", title: "Summer", position: { state: "finished" } }),
                ]}
            />
        )

        const running = screen.getByRole("region", { name: "Running" })
        expect(within(running).getByText("Run Club")).toBeInTheDocument()
        expect(within(running).getByText(/Week 2 of 4/)).toBeInTheDocument()
        expect(within(screen.getByRole("region", { name: "Coming up" })).getByText(/Starts Oct 4/)).toBeInTheDocument()
        expect(within(screen.getByRole("region", { name: "Finished" })).getByText(/Finished Oct 31/)).toBeInTheDocument()
        // Nothing counts before the start
        expect(screen.getAllByText("1 of 4 weeks complete")).toHaveLength(2)
        expect(within(screen.getByRole("region", { name: "Coming up" })).getByText("0 of 4 weeks complete")).toBeInTheDocument()
    })

    it("says what competitions are for when there are none, and starts a new one", async () => {
        const user = userEvent.setup()
        render(<CompetitionList competitions={[]} />)

        await user.click(screen.getByRole("button", { name: "Create your first competition" }))

        expect(push).toHaveBeenCalledWith("/dashboard/competitions/new")
    })

    it("lets only the owner delete, with an undo", async () => {
        const user = userEvent.setup()
        render(<CompetitionList competitions={[view(), view({ id: "theirs", title: "Their Club", isOwner: false })]} />)

        expect(screen.queryByRole("button", { name: "Delete Their Club" })).not.toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "Delete Run Club" }))

        expect(screen.queryByText("Run Club")).not.toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
    })
})

describe("CompetitionForm", () => {
    it("starts on the week's Sunday, and fills every week from one target", async () => {
        const user = userEvent.setup()
        render(<CompetitionForm today="2026-10-14" />)

        expect(screen.getByText("Starts Sunday, Oct 11")).toBeInTheDocument()
        await user.type(screen.getByLabelText("Target every week"), "15")

        for (const week of [1, 2, 3, 4]) expect(screen.getByLabelText(`Week ${week}`)).toHaveValue(15)
    })

    it("keeps typed targets when weeks are added", async () => {
        const user = userEvent.setup()
        render(<CompetitionForm today="2026-10-14" />)

        await user.type(screen.getByLabelText("Target every week"), "15")
        await user.clear(screen.getByLabelText("Week 2"))
        await user.type(screen.getByLabelText("Week 2"), "20")
        fireEvent.change(screen.getByLabelText("Weeks"), { target: { value: "5" } })

        expect(screen.getByLabelText("Week 2")).toHaveValue(20)
        expect(screen.getByLabelText("Week 5")).toHaveValue(15)
    })

    it("sends the metrics and opens the new competition", async () => {
        const user = userEvent.setup()
        vi.mocked(createCompetition).mockResolvedValue({ competition: { id: "new-1" } } as never)
        render(<CompetitionForm today="2026-10-14" />)

        await user.type(screen.getByLabelText("Name"), "Run Club")
        await user.type(screen.getByLabelText("What you measure"), "km run")
        await user.type(screen.getByLabelText("Unit (optional)"), "km")
        await user.type(screen.getByLabelText("Target every week"), "12")
        await user.click(screen.getByRole("button", { name: "Create competition" }))

        await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/competitions/new-1"))
        const sent = vi.mocked(createCompetition).mock.calls[0][0] as FormData
        expect(sent.get("weeks")).toBe("4")
        expect(JSON.parse(String(sent.get("metrics")))).toEqual([{ name: "km run", unit: "km", targets: [12, 12, 12, 12] }])
    })

    it("goes up to three years of weeks", () => {
        render(<CompetitionForm today="2026-10-14" />)

        fireEvent.change(screen.getByLabelText("Weeks"), { target: { value: "500" } })

        expect(screen.getByLabelText("Weeks")).toHaveValue(156)
        expect(screen.getByLabelText("Week 156")).toBeInTheDocument()
    })

    it("ramps targets from the first week to the last, and draws them", async () => {
        const user = userEvent.setup()
        render(<CompetitionForm today="2026-10-14" />)

        await user.click(screen.getByRole("button", { name: "Ramp" }))
        await user.type(screen.getByLabelText("First week"), "10")
        await user.type(screen.getByLabelText("Last week"), "16")

        expect([1, 2, 3, 4].map(w => (screen.getByLabelText(`Week ${w}`) as HTMLInputElement).value)).toEqual(["10", "12", "14", "16"])
        expect(screen.getByTestId("target-bars").children).toHaveLength(4)
    })

    it("allows up to three metrics", async () => {
        const user = userEvent.setup()
        render(<CompetitionForm today="2026-10-14" />)

        await user.click(screen.getByRole("button", { name: "+ Add a metric" }))
        await user.click(screen.getByRole("button", { name: "+ Add a metric" }))

        expect(screen.getAllByRole("group", { name: /Metric/ })).toHaveLength(3)
        expect(screen.queryByRole("button", { name: "+ Add a metric" })).not.toBeInTheDocument()
    })

    it("shows the server's reason when it can't create", async () => {
        const user = userEvent.setup()
        vi.mocked(createCompetition).mockResolvedValue({ error: "Every target has to be above 0" })
        render(<CompetitionForm today="2026-10-14" />)

        await user.type(screen.getByLabelText("Name"), "Run Club")
        await user.type(screen.getByLabelText("What you measure"), "km run")
        await user.type(screen.getByLabelText("Target every week"), "0")
        await user.click(screen.getByRole("button", { name: "Create competition" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Every target has to be above 0")
        expect(push).not.toHaveBeenCalled()
    })
})

describe("CompetitionDetail", () => {
    it("leads with the standing: week, days left, weeks complete, and what's left this week", () => {
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        const hero = screen.getByRole("region", { name: "Standing" })
        expect(within(hero).getByText("Week 2 of 4 · 4 days left")).toBeInTheDocument()
        expect(within(hero).getByText("weeks complete").previousSibling).toHaveTextContent("1 / 4")
        expect(within(hero).getByText("3 km")).toBeInTheDocument()
        expect(within(hero).getByRole("img", { name: "This week 75%" })).toBeInTheDocument()
    })

    it("draws this week as a lane toward the finish", () => {
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        expect(screen.getByText("9 of 12 km")).toBeInTheDocument()
        expect(screen.getByRole("progressbar", { name: "km run this week" })).toHaveAttribute("aria-valuenow", "75")
    })

    it("logs into this week and says when the week is complete", async () => {
        const user = userEvent.setup()
        vi.mocked(logProgress).mockResolvedValue({ log: { id: "c", metricId: "km", week: 2, amount: 3, note: null, createdAt: new Date() } } as never)
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        await user.type(screen.getByLabelText("Amount"), "3")
        await user.click(screen.getByRole("button", { name: "Log it" }))

        expect(await screen.findByRole("status")).toHaveTextContent("Week 2 complete.")
        expect(screen.getByText("12 of 12 km")).toBeInTheDocument()
        // The week's square turns gold, with a pop
        expect(screen.getByText("Week 2: complete").parentElement!.className).toContain("animate-check-pop")
        expect((vi.mocked(logProgress).mock.calls[0][1] as FormData).get("amount")).toBe("3")
    })

    it("explains when a log is refused", async () => {
        const user = userEvent.setup()
        vi.mocked(logProgress).mockResolvedValue({ error: "This competition has finished" })
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        await user.type(screen.getByLabelText("Amount"), "3")
        await user.click(screen.getByRole("button", { name: "Log it" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("This competition has finished")
    })

    it("logs a quick amount sized to the week's target", async () => {
        const user = userEvent.setup()
        vi.mocked(logProgress).mockResolvedValue({ log: { id: "c", metricId: "km", week: 2, amount: 5, note: null, createdAt: new Date() } } as never)
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        // A 12 km week offers +1 and +5
        expect(screen.getByRole("button", { name: "+1 km" })).toBeInTheDocument()
        await user.click(screen.getByRole("button", { name: "+5 km" }))

        expect((vi.mocked(logProgress).mock.calls[0][1] as FormData).get("amount")).toBe("5")
    })

    it("folds targets by month, with this month open", () => {
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        const october = screen.getByText("This month").closest("details")!
        expect(october).toHaveAttribute("open")
        expect(within(october).getByText("km run 10 to 16 km")).toBeInTheDocument()
    })

    it("lets you remove this week's logs only", () => {
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        expect(screen.getByRole("button", { name: "Remove 9 km from week 2" })).toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /from week 1/ })).not.toBeInTheDocument()
    })

    it("lets the owner change weeks that haven't started, and saves them", async () => {
        const user = userEvent.setup()
        vi.mocked(updateFutureTargets).mockResolvedValue(undefined)
        render(<CompetitionDetail competition={view()} today="2026-10-14" />)

        expect(screen.queryByLabelText("km run, week 2")).not.toBeInTheDocument()
        const week3 = screen.getByLabelText("km run, week 3")
        await user.clear(week3)
        await user.type(week3, "15")
        await user.click(screen.getByRole("button", { name: "Save targets" }))

        expect(updateFutureTargets).toHaveBeenCalledWith("run", [{ metricId: "km", week: 3, target: 15 }])
        expect(await screen.findByText("Targets saved.")).toBeInTheDocument()
    })

    it("shows targets without editing to someone who didn't create it", () => {
        render(<CompetitionDetail competition={view({ isOwner: false })} today="2026-10-14" />)

        expect(screen.queryByLabelText("km run, week 3")).not.toBeInTheDocument()
    })

    it("has no log form before the start or after the end", () => {
        render(<CompetitionDetail competition={view({ position: { state: "finished" } })} today="2026-11-02" />)

        expect(screen.queryByRole("button", { name: "Log it" })).not.toBeInTheDocument()
        expect(screen.getByText("Finished Oct 31")).toBeInTheDocument()
        expect(screen.getByText(/Finished with/)).toHaveTextContent("Finished with 1 of 4 weeks complete.")
    })
})

describe("long seasons", () => {
    const year = (weeks: number) => {
        const weekTargets = Array.from({ length: weeks }, (_, i) => ({ metricId: "km", week: i + 1, target: 20 }))
        return view({ weeks, targets: weekTargets, logs: [], position: { state: "active", week: 20 } })
    }

    it("lays a year out in four rows of 13 weeks", () => {
        render(<CompetitionDetail competition={year(52)} today="2027-02-17" />)

        const season = screen.getByRole("region", { name: "Season" })
        expect(within(season).getAllByRole("list", { name: /^Weeks \d+ to \d+$/ })).toHaveLength(4)
        expect(within(season).queryByText("Year 1")).not.toBeInTheDocument()
    })

    it("gives each year of a three-year season its own heading", () => {
        render(<CompetitionDetail competition={year(156)} today="2027-02-17" />)

        const season = screen.getByRole("region", { name: "Season" })
        expect(within(season).getByText("Year 3")).toBeInTheDocument()
        expect(within(season).getAllByRole("list", { name: /^Weeks \d+ to \d+$/ })).toHaveLength(12)
    })

    it("shows a long season on its card as one bar instead of squares", () => {
        render(<CompetitionList competitions={[year(52)]} />)

        expect(screen.getByRole("img", { name: "Run Club weeks: 0 complete, 19 missed, 32 ahead" })).toBeInTheDocument()
    })
})
