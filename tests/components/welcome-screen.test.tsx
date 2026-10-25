// tests/components/welcome-screen.test.tsx
// @vitest-environment jsdom
import WelcomeScreen from "@/components/welcome/WelcomeScreen"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next-auth/react", () => ({
    signIn: vi.fn(),
}))

// next/image needs Next's image loader; a stand-in with the same accessible name is enough here
vi.mock("next/image", () => ({
    default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}))

describe("WelcomeScreen", () => {
    it("leads with the headline and links to the source", () => {
        render(<WelcomeScreen initialMode="login" homePath="/" />)

        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Know what to do today, and why")
        expect(screen.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute("href", "https://github.com/Matt4228/apex-os")
    })

    it("describes the screenshot for people who can't see it", () => {
        render(<WelcomeScreen initialMode="login" homePath="/" />)

        expect(screen.getByRole("img", { name: /The Today page/ })).toBeInTheDocument()
        expect(screen.getByRole("img", { name: /grouped under its schedule blocks/ })).toBeInTheDocument()
    })

    it("shows the screenshot in a browser window, with the live address", () => {
        render(<WelcomeScreen initialMode="login" homePath="/" />)

        const frame = screen.getByTestId("browser-frame")
        expect(frame).toHaveTextContent("apex-os-sand.vercel.app")
        expect(frame).toContainElement(screen.getByRole("img", { name: /The Today page/ }))
    })

    it("lets the band, not the screenshot, decide the page's height, so the page doesn't scroll", () => {
        render(<WelcomeScreen initialMode="login" homePath="/" />)

        // Taken out of the flow, the window adds no height: the band fills what's left of the screen and cuts it off
        const window = screen.getByTestId("browser-frame").parentElement!
        expect(window).toHaveClass("absolute")
        expect(window.parentElement).toHaveClass("flex-1", "overflow-hidden")
    })

    it("opens the card on the tab the address asked for", () => {
        render(<WelcomeScreen initialMode="register" homePath="/login" />)

        expect(screen.getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true")
    })
})
