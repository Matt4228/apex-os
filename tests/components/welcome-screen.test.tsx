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
    })

    it("opens the card on the tab the address asked for", () => {
        render(<WelcomeScreen initialMode="register" homePath="/login" />)

        expect(screen.getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true")
    })
})
