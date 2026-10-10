// tests/lib/dates.test.ts
import { formatDateOnly, parseDateOnly, toDateInputValue, dayRangeOf, weekRangeOf, todayIn } from "@/lib/dates"
import { describe, expect, it} from "vitest"

describe("test timezone", () => {
    it("runs in New York time so timezone bugs show up on every machine", () => {
        // January in Jew York is UTC-5, i.e. 300 minutes behind
        expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(300)
    })
})

describe("parseDateOnly", () => {
    it("stores a calendar date as midnight UTC", () => {
        expect(parseDateOnly("2026-10-15").toISOString()).toBe("2026-10-15T00:00:00.000Z")
    })
})

describe("formatDateOnly", () => {
    it("shows the same calendar day in a timezone behind UTC", () => {
        expect(formatDateOnly(parseDateOnly("2026-10-15"), "MMM d")).toBe("Oct 15")
    })

    it("reads dates saved with a time of day by their UTC calendar day", () => {
        // Older check-ins were saved at local midnight in New York (04:00 UTC)
        expect(formatDateOnly(new Date("2026-10-10T04:00:00Z"), "MMM d")).toBe("Oct 10")
    })
})

describe("toDateInputValue", () => {
    it("round-trips through a date input without drifting", () => {
        expect(toDateInputValue(parseDateOnly("2026-10-15"))).toBe("2026-10-15")
    })
})

describe("dayRangeOf", () => {
    it("covers exactly one calendar day in UTC", () => {
        const { start, end } = dayRangeOf("2026-10-10")
        expect(start.toISOString()).toBe("2026-10-10T00:00:00.000Z")
        expect(end.toISOString()).toBe("2026-10-11T00:00:00.000Z")
    })
})

describe("weekRangeOf", () => {
    it("covers Sunday through Saturday of the week containing the day", () => {
        const { start, end } = weekRangeOf("2026-10-15")
        expect(start.toISOString()).toBe("2026-10-11T00:00:00.000Z")
        expect(end.toISOString()).toBe("2026-10-18T00:00:00.000Z")
    })
})

describe("todayIn", () => {
    // 02:00 UTC on Oct 11 is still 10 PM on Oct 10 in New York
    const lateEvening = new Date("2026-10-11T02:00:00Z")

    it("returns the calendar day in the given timezone", () => {
        expect(todayIn("America/New_York", lateEvening)).toBe("2026-10-10")
        expect(todayIn("UTC", lateEvening)).toBe("2026-10-11")
    })

    it("falls back to UTC for an unknown timezone instead of crashing", () => {
        expect(todayIn("Not/A_Zone", lateEvening)).toBe("2026-10-11")
    })
})
