// tests/lib/optimistic.test.ts
import { succeeded } from "@/lib/optimistic"
import { describe, expect, it } from "vitest"

describe("succeeded", () => {
    it("is true when the action finishes without an error", async () => {
        expect(await succeeded(Promise.resolve(undefined))).toBe(true)
        expect(await succeeded(Promise.resolve({ block: { id: "b1" } }))).toBe(true)
    })

    it("is false when the action returns { error }", async () => {
        expect(await succeeded(Promise.resolve({ error: "Unauthorized" }))).toBe(false)
    })

    it("is false when the action throws", async () => {
        expect(await succeeded(Promise.reject(new Error("network down")))).toBe(false)
    })
})
