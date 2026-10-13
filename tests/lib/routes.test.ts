// tests/lib/routes.test.ts
import { routeFor } from "@/lib/routes"
import { describe, expect, it } from "vitest"

describe("routeFor", () => {
    it.each(["/", "/login", "/register"])("lets a logged-out visitor see %s", path => {
        expect(routeFor(path, false)).toBe("next")
    })

    it.each(["/", "/login", "/register"])("sends a signed-in visitor on %s to the dashboard", path => {
        expect(routeFor(path, true)).toBe("/dashboard")
    })

    it("sends a logged-out visitor anywhere else to sign in", () => {
        expect(routeFor("/dashboard/tasks", false)).toBe("/login")
        expect(routeFor("/api/items/task/t1", false)).toBe("/login")
    })

    it("lets a signed-in visitor into the app", () => {
        expect(routeFor("/dashboard/tasks", true)).toBe("next")
    })

    it("always lets next-auth and the cron job through", () => {
        expect(routeFor("/api/auth/session", false)).toBe("next")
        expect(routeFor("/api/cron/reseed-demo", false)).toBe("next")
        expect(routeFor("/api/auth/session", true)).toBe("next")
    })

    it("matches whole path segments, so a look-alike path stays private", () => {
        expect(routeFor("/login-help", false)).toBe("/login")
        expect(routeFor("/api/authx", false)).toBe("/login")
    })
})
