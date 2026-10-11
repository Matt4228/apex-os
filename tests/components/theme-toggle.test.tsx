// tests/components/theme-toggle.test.tsx
// @vitest-environment jsdom
import ThemeToggle from "@/components/layout/ThemeToggle"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

describe("ThemeToggle", () => {
    it("switches to light, updates the page, and remembers the choice", async () => {
        const user = userEvent.setup()
        document.documentElement.dataset.theme = "dark"
        render(<ThemeToggle initialTheme="dark" />)

        await user.click(screen.getByRole("button", { name: "Switch to light theme" }))

        expect(document.documentElement.dataset.theme).toBe("light")
        expect(document.cookie).toContain("theme=light")
        expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument()
    })
})