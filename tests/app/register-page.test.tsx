// tests/app/register-page.test.tsx
// @vitest-environment jsdom
import RegisterPage from "@/app/register/page"
import { registerUser } from "@/app/actions/auth"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { signIn } from "next-auth/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

async function fillInAndSubmit() {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText("Name"), "Matt")
    await user.type(screen.getByLabelText("Email"), "matt@example.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: "Create account" }))
}

describe("RegisterPage", () => {
    beforeEach(() => {
        pushMock.mockReset()
        vi.mocked(signIn).mockReset()
        vi.mocked(registerUser).mockReset()
    })

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

        expect(await screen.findByRole("alert")).toHaveTextContent("An account with that email already exists.")
        expect(signIn).not.toHaveBeenCalled()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it("points to the sign-in page when the account was created but signing in failed", async () => {
        vi.mocked(registerUser).mockResolvedValue({ success: true })
        vi.mocked(signIn).mockResolvedValue({ error: "CredentialsSignin" } as never)

        await fillInAndSubmit()

        expect(await screen.findByRole("alert")).toHaveTextContent("Your account was created, but we couldn't sign you in.")
        expect(screen.getByRole("link", { name: "Sign in here" })).toHaveAttribute("href", "/login")
        expect(pushMock).not.toHaveBeenCalled()
    })
})