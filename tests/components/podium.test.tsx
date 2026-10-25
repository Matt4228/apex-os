// tests/components/podium.test.tsx
// @vitest-environment jsdom
import Podium from "@/components/competitions/Podium"
import { standingText } from "@/components/competitions/format"
import type { Standing } from "@/lib/standings"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

const row = (name: string, place: number, completedWeeks: number, totalProgress: number, isYou = false): Standing => ({
    participantId: name, userId: name, name, initials: name.slice(0, 2).toUpperCase(), isYou, place, race: 0, week: null,
    season: { completedWeeks, totalProgress, weeks: [] },
})

const items = () => screen.getAllByRole("listitem").map(li => li.getAttribute("aria-label"))

describe("Podium", () => {
    it("reads 1st to 3rd in order, but draws 1st in the middle with the crown, 2nd on the left and 3rd on the right", () => {
        render(<Podium standings={[row("Sam Chen", 1, 3, 341), row("Me Too", 2, 3, 318, true), row("Alex Rivera", 3, 2, 296)]} />)

        expect(screen.getByRole("list", { name: "Podium" })).toBeInTheDocument()
        expect(items()).toEqual(["1st Sam", "2nd You", "3rd Alex"])
        // CSS order sets the steps left to right: 2nd, 1st, 3rd
        expect(screen.getByRole("listitem", { name: "2nd You" })).toHaveClass("order-1")
        expect(screen.getByRole("listitem", { name: "1st Sam" })).toHaveClass("order-2")
        expect(screen.getByRole("listitem", { name: "3rd Alex" })).toHaveClass("order-3")
        expect(within(screen.getByRole("listitem", { name: "1st Sam" })).getByRole("img", { name: "Leader" })).toBeInTheDocument()
    })

    it("has two steps for two people, 2nd drawn on the left", () => {
        render(<Podium standings={[row("Sam Chen", 1, 3, 341), row("Me Too", 2, 3, 318, true)]} />)

        expect(items()).toEqual(["1st Sam", "2nd You"])
        expect(screen.getByRole("listitem", { name: "2nd You" })).toHaveClass("order-1")
        expect(screen.getByRole("listitem", { name: "1st Sam" })).toHaveClass("order-2")
    })

    it("shares the top step and the crown on a tie", () => {
        render(<Podium standings={[row("Sam Chen", 1, 3, 300), row("Me Too", 1, 3, 300, true), row("Alex Rivera", 3, 2, 296)]} />)

        expect(items()).toEqual(["1st Sam", "1st You", "3rd Alex"])
        expect(screen.getAllByRole("img", { name: "Leader" })).toHaveLength(2)
    })
})

describe("standingText", () => {
    it("says your place and the gap to the person ahead", () => {
        expect(standingText([row("Sam Chen", 1, 3, 341), row("Me Too", 2, 3, 318, true)])).toBe("You're 2nd, 23 points behind Sam.")
        expect(standingText([row("Sam Chen", 1, 3, 341), row("Me Too", 2, 2, 318, true)])).toBe("You're 2nd, 1 week behind Sam.")
    })

    it("gives your lead when you're 1st", () => {
        expect(standingText([row("Me Too", 1, 4, 341, true), row("Alex Rivera", 2, 2, 296)])).toBe("You're 1st, 2 weeks ahead of Alex.")
        expect(standingText([row("Me Too", 1, 3, 341, true), row("Alex Rivera", 2, 3, 296)])).toBe("You're 1st, 45 points ahead of Alex.")
    })

    it("says less than a point when a fraction splits two places, and 1 point, not 1 points", () => {
        expect(standingText([row("Sam Chen", 1, 3, 318.4), row("Me Too", 2, 3, 318.1, true)])).toBe("You're 2nd, less than a point behind Sam.")
        expect(standingText([row("Me Too", 1, 3, 318.4, true), row("Alex Rivera", 2, 3, 318.1)])).toBe("You're 1st, less than a point ahead of Alex.")
        expect(standingText([row("Sam Chen", 1, 3, 319), row("Me Too", 2, 3, 318, true)])).toBe("You're 2nd, 1 point behind Sam.")
    })

    it("says when you're tied", () => {
        expect(standingText([row("Sam Chen", 1, 3, 300), row("Me Too", 1, 3, 300, true)])).toBe("You're tied for 1st with Sam.")
    })

    it("says where you finished once it's over", () => {
        expect(standingText([row("Me Too", 1, 4, 341, true), row("Alex Rivera", 2, 2, 296)], true)).toBe("You finished 1st, 2 weeks ahead of Alex.")
        expect(standingText([row("Sam Chen", 1, 3, 341), row("Me Too", 2, 3, 318, true)], true)).toBe("You finished 2nd, 23 points behind Sam.")
        expect(standingText([row("Sam Chen", 1, 3, 300), row("Me Too", 1, 3, 300, true)], true)).toBe("You finished tied for 1st with Sam.")
    })
})
