// tests/lib/theme.test.ts
import { parseTheme } from "@/lib/theme"
import { describe, expect, it } from "vitest"

describe("parseTheme", () => {
    it("defaults to dark when there's no saved choice", () => {
        expect(parseTheme(undefined)).toBe("dark")
    })

    it("keeps a saved light preference", () => {
        expect(parseTheme("light")).toBe("light")
    })

    it("falls back to dark for anything unexpected", () => {
        expect(parseTheme("purple")).toBe("dark")
    })
})