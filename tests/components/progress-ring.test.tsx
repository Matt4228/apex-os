// tests/components/progress-ring.test.tsx
// @vitest-environment jsdom
import { ProgressRing } from "@/components/ui/progress-ring"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

describe("ProgressRing", () => {
    it("reads as a progress bar with its percent", () => {
        render(<ProgressRing percent={40} label="Run a half marathon progress" />)

        const ring = screen.getByRole("progressbar", { name: "Run a half marathon progress" })
        expect(ring).toHaveAttribute("aria-valuenow", "40")
        expect(ring).toHaveTextContent("40%")
    })

    it("fills in proportion, and stays inside 0 to 100", () => {
        const { rerender } = render(<ProgressRing percent={25} label="Goal" />)
        const value = () => screen.getByTestId("ring-value")
        const length = Number(value().getAttribute("stroke-dasharray"))

        expect(Number(value().getAttribute("stroke-dashoffset"))).toBeCloseTo(length * 0.75)

        rerender(<ProgressRing percent={140} label="Goal" />)
        expect(Number(value().getAttribute("stroke-dashoffset"))).toBeCloseTo(0)
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
    })
})
