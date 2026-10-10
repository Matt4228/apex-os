// tests/components/competition-card.test.tsx
// @vitest-environment jsdom
import CompetitionCard from "@/components/competitions/CompetitionCard"
import { parseDateOnly } from "@/lib/dates"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

describe("CompetitionCard dates", () => {
    it("shows the saved start and end days", () => {
        render(
            <CompetitionCard 
                competition={{
                    id: "comp-1",
                    title: "October push-ups",
                    status: "active",
                    startDate: parseDateOnly("2026-10-01"),
                    endDate: parseDateOnly("2026-10-29"),
                    rulesJson: null,
                    entries: [],
                }}
                onDelete={vi.fn()}
                onStatusChange={vi.fn()}
                onEntryLogged={vi.fn()}
            />
        )
        
        expect(screen.getByText(/Oct 1 - Oct 29, 2026/)).toBeInTheDocument()
    })
})