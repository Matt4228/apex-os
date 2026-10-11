// tests/components/timezone-cookie.test.tsx
// @vitest-environment jsdom
import TimezoneCookie from "@/components/layout/TimezoneCookie"
import { TIMEZONE_COOKIE } from "@/lib/dates"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const refreshMock = vi.fn()

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh: refreshMock }),
}))

const browserTimeZone = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)

describe("TimezoneCookie", () => {
    beforeEach(() => {
        refreshMock.mockReset()
        // Expire the cookie so each test starts without one
        document.cookie = `${TIMEZONE_COOKIE}=; path=/; max-age=0`
    })

    it("does not refresh when the cookie already matches the browser's timezone", () => {
        document.cookie = `${TIMEZONE_COOKIE}=${browserTimeZone}; path=/`

        render(<TimezoneCookie />)

        expect(refreshMock).not.toHaveBeenCalled()
    })

    it("sets the cookie and refreshes once when it is missing", () => {
        render(<TimezoneCookie />)

        expect(document.cookie).toContain(`${TIMEZONE_COOKIE}=${browserTimeZone}`)
        expect(refreshMock).toHaveBeenCalledTimes(1)
    })
})