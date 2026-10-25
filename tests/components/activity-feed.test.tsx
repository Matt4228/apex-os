// tests/components/activity-feed.test.tsx
// @vitest-environment jsdom
import ActivityFeed, { dayHeading, groupByDay } from "@/components/competitions/ActivityFeed"
import { toDateInputValue } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

const metrics = [{ id: "km", name: "km run", unit: "km" }, { id: "wo", name: "Workouts", unit: null }]
const entry = (id: string, who: "You" | "Sam", week: number, amount: number, at: string, o: { note?: string; metricId?: string } = {}) => ({
    id,
    participantId: who === "You" ? "p1" : "p2",
    name: who === "You" ? "Me Too" : "Sam Chen",
    initials: who === "You" ? "MT" : "SC",
    isYou: who === "You",
    metricId: o.metricId ?? "km",
    week,
    amount,
    note: o.note ?? null,
    createdAt: new Date(at),
})

describe("groupByDay", () => {
    it("keeps the newest first, one group per day", () => {
        const entries = [entry("a", "Sam", 2, 1, "2026-10-14T18:00:00Z"), entry("b", "You", 2, 1, "2026-10-14T08:00:00Z"), entry("c", "Sam", 2, 1, "2026-10-12T08:00:00Z")]

        expect(groupByDay(entries, toDateInputValue).map(g => [g.day, g.entries.map(e => e.id)])).toEqual([
            ["2026-10-14", ["a", "b"]],
            ["2026-10-12", ["c"]],
        ])
    })
})

describe("dayHeading", () => {
    it("says Today and Yesterday, then the date", () => {
        expect(dayHeading("2026-10-14", "2026-10-14")).toBe("Today")
        expect(dayHeading("2026-10-13", "2026-10-14")).toBe("Yesterday")
        expect(dayHeading("2026-10-12", "2026-10-14")).toBe("Mon, Oct 12")
    })
})

describe("ActivityFeed", () => {
    const entries = [
        entry("s1", "Sam", 2, 6.2, "2026-10-14T18:00:00Z", { note: "Legs were dead" }),
        entry("m1", "You", 2, 9, "2026-10-14T08:00:00Z"),
        entry("s0", "Sam", 2, 1, "2026-10-13T08:00:00Z", { metricId: "wo" }),
        entry("m0", "You", 1, 11, "2026-10-08T08:00:00Z"),
    ]

    it("shows who logged what, with the note", () => {
        render(<ActivityFeed entries={entries} metrics={metrics} today="2026-10-14" thisWeek={2} onDelete={vi.fn()} />)

        expect(screen.getByRole("region", { name: "Activity" })).toBeInTheDocument()
        expect(screen.getAllByText("You")).toHaveLength(2)
        expect(screen.getAllByText("Sam")).toHaveLength(2)
        expect(screen.getByText("6.2 km")).toBeInTheDocument()
        expect(screen.getByText("1 workout")).toBeInTheDocument()
        expect(screen.getByText("Legs were dead")).toBeInTheDocument()
    })

    it("breaks a long unbroken name instead of spilling over the time", () => {
        const long = { ...entries[0], id: "x", name: "Maximilianowithanunbrokenname" }
        render(<ActivityFeed entries={[long]} metrics={metrics} today="2026-10-14" thisWeek={2} onDelete={vi.fn()} />)

        expect(screen.getByText("Maximilianowithanunbrokenname")).toHaveClass("break-all")
    })

    it("offers Remove on your own logs from this week only", async () => {
        const user = userEvent.setup()
        const onDelete = vi.fn()
        render(<ActivityFeed entries={entries} metrics={metrics} today="2026-10-14" thisWeek={2} onDelete={onDelete} />)

        const removes = screen.getAllByRole("button", { name: /^Remove/ })
        expect(removes).toHaveLength(1)
        await user.click(screen.getByRole("button", { name: "Remove 9 km from week 2" }))
        expect(onDelete).toHaveBeenCalledWith("m1")
    })
})
