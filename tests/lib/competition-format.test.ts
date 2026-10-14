// tests/lib/competition-format.test.ts
import { amountText, leftText } from "@/components/competitions/format"
import { describe, expect, it } from "vitest"

describe("competition wording", () => {
    it("rounds to one decimal with the unit", () => {
        expect(amountText(12.345, "km")).toBe("12.3 km")
        expect(amountText(3, null)).toBe("3")
    })

    it("names what's left by unit, or by the metric for counts, singular for one", () => {
        expect(leftText(3, { name: "km run", unit: "km" })).toBe("3 km")
        expect(leftText(2, { name: "Workouts", unit: null })).toBe("2 workouts")
        expect(leftText(1, { name: "Workouts", unit: null })).toBe("1 workout")
        expect(leftText(1, { name: "Pages read", unit: "pages" })).toBe("1 page")
        expect(amountText(1, "km")).toBe("1 km")
    })
})
