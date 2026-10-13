// tests/lib/week-param.test.ts
import { weekStartFor } from "@/lib/weekParam"
import { describe, expect, it } from "vitest"

// 2026-10-14 is a Wednesday; its week starts Sunday 2026-10-11
const TODAY = "2026-10-14"

describe("weekStartFor", () => {
    it("opens this week when the address has no week", () => {
        expect(weekStartFor(undefined, TODAY)).toBe("2026-10-11")
    })

    it("opens the week holding any day in the address", () => {
        expect(weekStartFor("2026-12-02", TODAY)).toBe("2026-11-29")
        expect(weekStartFor("2026-11-29", TODAY)).toBe("2026-11-29")
    })

    it("opens past weeks too", () => {
        expect(weekStartFor("2025-01-01", TODAY)).toBe("2024-12-29")
    })

    it("falls back to this week for anything that isn't a real date", () => {
        for (const junk of ["next", "2026-13-01", "2026-02-31", "2026-1-5", ""]) {
            expect(weekStartFor(junk, TODAY)).toBe("2026-10-11")
        }
    })
})
