// tests/lib/theme.test.ts
import { parseTheme } from "@/lib/theme"
import { describe, expect, it } from "vitest"

describe("parseTheme", () => {
    it("defaults to light when there's no saved choice", () => {
        expect(parseTheme(undefined)).toBe("light")
    })

    it("keeps a saved dark preference", () => {
        expect(parseTheme("dark")).toBe("dark")
    })

    it("falls back to light for anything unexpected", () => {
        expect(parseTheme("purple")).toBe("light")
    })
})