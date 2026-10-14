// tests/components/sidebar.test.tsx
// @vitest-environment jsdom
import Sidebar from "@/components/layout/Sidebar"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { usePathname } from "next/navigation"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }))
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }))

function renderAt(pathname: string) {
    vi.mocked(usePathname).mockReturnValue(pathname)
    return render(<Sidebar userName="Matt" theme="dark" />)
}

describe("Sidebar", () => {
    it("marks the link for the current page", () => {
        renderAt("/dashboard/goals")

        expect(screen.getByRole("link", { name: "Goals" })).toHaveAttribute("aria-current", "page")
        expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current")
    })

    it("keeps a section marked on pages nested under it", () => {
        renderAt("/dashboard/tasks/123")

        expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page")
        expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current")
    })

    it("opens the mobile menu and closes it with the close button or Escape", async () => {
        const user = userEvent.setup()
        renderAt("/dashboard")
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Open menu" }))
        const menu = screen.getByRole("dialog", { name: "Menu" })
        expect(within(menu).getByRole("link", { name: "Tasks" })).toBeInTheDocument()

        await user.click(within(menu).getByRole("button", { name: "Close menu" }))
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

        await user.click(screen.getByRole("button", { name: "Open menu" }))
        await user.keyboard("{Escape}")
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    it("keeps Competitions marked on the Friends page", () => {
        renderAt("/dashboard/friends")

        expect(screen.getAllByRole("link", { name: "Competitions" })[0]).toHaveAttribute("aria-current", "page")
    })

    it("shows how many requests and invites are waiting", () => {
        vi.mocked(usePathname).mockReturnValue("/dashboard")
        render(<Sidebar userName="Matt" theme="dark" waiting={2} />)

        expect(screen.getAllByRole("link", { name: "Competitions, 2 waiting" }).length).toBeGreaterThan(0)
    })
})
