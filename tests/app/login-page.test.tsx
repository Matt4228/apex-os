// tests/app/login-page.test.tsx
// @vitest-environment jsdom
import LoginPage from "@/app/login/page"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { signIn } from "next-auth/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock}),
}))

vi.mock("next-auth/react", () => ({
    signIn: vi.fn(),
}))

describe("LoginPage", () => {
    beforeEach(() => {
        pushMock.mockReset()
        vi.mocked(signIn).mockReset()
    })

    it("navigates to the absolute /dashboard path after a successful sign-in", async () => {
        vi.mocked(signIn).mockResolvedValue({ error: undefined } as never)
        const user = userEvent.setup()
        render(<LoginPage />)

        await user.type(screen.getByPlaceholderText("you@example.com"), "matt@example.com")
        await user.type(screen.getByPlaceholderText("Your password"), "password123")
        await user.click(screen.getByRole("button", { name: "Sign in" }))

        await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"))
    })
})