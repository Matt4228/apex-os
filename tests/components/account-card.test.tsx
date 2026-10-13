// tests/components/account-card.test.tsx
// @vitest-environment jsdom
import AccountCard from "@/components/welcome/AccountCard"
import { registerUser } from "@/app/actions/auth"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { signIn } from "next-auth/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}))

vi.mock("next-auth/react", () => ({
    signIn: vi.fn(),
}))

vi.mock("@/app/actions/auth", () => ({
    registerUser: vi.fn(),
}))

// Both panels stay mounted, so look inside the one you mean
const panel = (name: "Sign in" | "Create account") => within(screen.getByRole("tabpanel", { name }))

beforeEach(() => {
    pushMock.mockReset()
    vi.mocked(signIn).mockReset()
    vi.mocked(registerUser).mockReset()
    vi.spyOn(window.history, "replaceState")
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe("AccountCard switch", () => {
    it("opens on the tab it was given, with the other form inert", () => {
        render(<AccountCard initialMode="register" homePath="/login" />)

        expect(screen.getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true")
        expect(screen.getByRole("tabpanel", { name: "Sign in" })).toHaveAttribute("inert")
        expect(screen.getByRole("tabpanel", { name: "Create account" })).not.toHaveAttribute("inert")
    })

    it("keeps the address bar in step with the tab", async () => {
        const user = userEvent.setup()
        render(<AccountCard initialMode="login" homePath="/" />)

        await user.click(screen.getByRole("tab", { name: "Create account" }))
        expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/register")
        expect(screen.getByRole("tabpanel", { name: "Sign in" })).toHaveAttribute("inert")

        await user.click(screen.getByRole("tab", { name: "Sign in" }))
        expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/")
    })

    it("goes back to /login, not /, for a visitor who arrived on /register", async () => {
        const user = userEvent.setup()
        render(<AccountCard initialMode="register" homePath="/login" />)

        await user.click(screen.getByRole("tab", { name: "Sign in" }))

        expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/login")
    })

    it("moves between tabs with the arrow keys", async () => {
        const user = userEvent.setup()
        render(<AccountCard initialMode="login" homePath="/" />)

        await user.click(screen.getByRole("tab", { name: "Sign in" }))
        await user.keyboard("{ArrowRight}")

        expect(screen.getByRole("tab", { name: "Create account" })).toHaveFocus()
        expect(screen.getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true")
    })

    it("clears a form's error once you switch away and back", async () => {
        const user = userEvent.setup()
        vi.mocked(signIn).mockResolvedValue({ error: "CredentialsSignin" } as never)
        render(<AccountCard initialMode="login" homePath="/" />)

        await user.type(panel("Sign in").getByLabelText("Email"), "matt@example.com")
        await user.type(panel("Sign in").getByLabelText("Password"), "wrong-password")
        await user.click(panel("Sign in").getByRole("button", { name: "Sign in" }))
        expect(await panel("Sign in").findByRole("alert")).toHaveTextContent("Invalid email or password.")

        await user.click(screen.getByRole("tab", { name: "Create account" }))
        await user.click(screen.getByRole("tab", { name: "Sign in" }))

        expect(panel("Sign in").queryByRole("alert")).not.toBeInTheDocument()
    })
})

describe("signing in", () => {
    it("opens the dashboard after a successful sign-in", async () => {
        const user = userEvent.setup()
        vi.mocked(signIn).mockResolvedValue({ error: undefined } as never)
        render(<AccountCard initialMode="login" homePath="/" />)

        await user.type(panel("Sign in").getByLabelText("Email"), "matt@example.com")
        await user.type(panel("Sign in").getByLabelText("Password"), "password123")
        await user.click(panel("Sign in").getByRole("button", { name: "Sign in" }))

        await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"))
    })
})

describe("creating an account", () => {
    async function fillInAndSubmit() {
        const user = userEvent.setup()
        render(<AccountCard initialMode="register" homePath="/login" />)

        await user.type(panel("Create account").getByLabelText("Name"), "Matt")
        await user.type(panel("Create account").getByLabelText("Email"), "matt@example.com")
        await user.type(panel("Create account").getByLabelText("Password"), "password123")
        await user.click(panel("Create account").getByRole("button", { name: "Create account" }))
        return user
    }

    it("signs in with what was typed and opens the dashboard", async () => {
        vi.mocked(registerUser).mockResolvedValue({ success: true })
        vi.mocked(signIn).mockResolvedValue({ error: undefined } as never)

        await fillInAndSubmit()

        await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"))
        expect(signIn).toHaveBeenCalledWith("credentials", {
            email: "matt@example.com",
            password: "password123",
            redirect: false,
        })
    })

    it("shows the server's error and doesn't try to sign in", async () => {
        vi.mocked(registerUser).mockResolvedValue({ error: "An account with that email already exists." })

        await fillInAndSubmit()

        expect(await panel("Create account").findByRole("alert")).toHaveTextContent("An account with that email already exists.")
        expect(signIn).not.toHaveBeenCalled()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it("offers Sign in when the account was created but signing in failed", async () => {
        vi.mocked(registerUser).mockResolvedValue({ success: true })
        vi.mocked(signIn).mockResolvedValue({ error: "CredentialsSignin" } as never)

        const user = await fillInAndSubmit()

        expect(await panel("Create account").findByRole("alert")).toHaveTextContent("Your account was created, but we couldn't sign you in.")
        expect(pushMock).not.toHaveBeenCalled()

        await user.click(panel("Create account").getByRole("button", { name: "Sign in here" }))

        expect(screen.getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true")
        expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/login")
    })
})

describe("the demo", () => {
    it("signs in as the demo account and opens the dashboard", async () => {
        const user = userEvent.setup()
        vi.mocked(signIn).mockResolvedValue({ error: undefined } as never)
        render(<AccountCard initialMode="login" homePath="/" />)

        await user.click(screen.getByRole("button", { name: "Try the demo" }))

        expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "demo@apex-os.app", redirect: false }))
        await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"))
    })

    it("says so when the demo account can't be reached", async () => {
        const user = userEvent.setup()
        vi.mocked(signIn).mockResolvedValue({ error: "CredentialsSignin" } as never)
        render(<AccountCard initialMode="login" homePath="/" />)

        await user.click(screen.getByRole("button", { name: "Try the demo" }))

        expect(await screen.findByRole("alert")).toHaveTextContent("Demo account unavailable. Please try again later.")
        expect(pushMock).not.toHaveBeenCalled()
    })
})
