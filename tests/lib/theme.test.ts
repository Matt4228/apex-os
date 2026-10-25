// tests/lib/theme.test.ts
import { parseTheme, themeFor } from "@/lib/theme"
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

describe("themeFor", () => {
    it("keeps the welcome pages light, whatever was saved", () => {
        for (const path of ["/", "/login", "/register"]) expect(themeFor(path, "dark")).toBe("light")
    })

    it("uses the saved choice everywhere else", () => {
        expect(themeFor("/dashboard", "dark")).toBe("dark")
        expect(themeFor("/dashboard/habits", "dark")).toBe("dark")
        expect(themeFor("/dashboard", undefined)).toBe("light")
    })

    it("falls back to the saved choice when the path is unknown", () => {
        expect(themeFor(null, "dark")).toBe("dark")
    })
})
