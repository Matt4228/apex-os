// tests/lib/optimistic.test.ts
import { failureMessage } from "@/lib/optimistic"
import { describe, expect, it } from "vitest"

describe("failureMessage", () => {
    it("is null when the action finishes without an error", async () => {
        expect(await failureMessage(Promise.resolve(undefined), "save")).toBeNull()
        expect(await failureMessage(Promise.resolve({ block: { id: "b1" } }), "save")).toBeNull()
    })

    it("shows the server's own message when the action returns { error }", async () => {
        expect(await failureMessage(Promise.resolve({ error: "Plan the task for today first" }), "move that task"))
            .toBe("Couldn't move that task. Plan the task for today first.")
    })

    it("words an ended session as something the user can act on", async () => {
        expect(await failureMessage(Promise.resolve({ error: "Unauthorized" }), "update that task"))
            .toBe("Couldn't update that task. Your session has ended. Sign in again.")
    })

    it("blames the server, not the connection, when the server crashed", async () => {
        const crash = Object.assign(new Error("Unknown column"), { digest: "123" })
        expect(await failureMessage(Promise.reject(crash), "save"))
            .toBe("Couldn't save. Something went wrong on our side. Try again in a moment.")
    })

    it("asks to check the connection when the request never reached the server", async () => {
        expect(await failureMessage(Promise.reject(new TypeError("Failed to fetch")), "save"))
            .toBe("Couldn't save. Check your connection and try again.")
    })
})
