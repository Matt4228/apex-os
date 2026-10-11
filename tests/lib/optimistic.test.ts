// tests/lib/optimistic.test.ts
import { restoreAt, succeeded } from "@/lib/optimistic"
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

    describe("restoreAt", () => {
    const a = { id: "a" }
    const b = { id: "b" }
    const c = { id: "c" }

    it("puts the item back where it was", () => {
        expect(restoreAt([a, c], b, 1)).toEqual([a, b, c])
    })

    it("doesn't add a duplicate if the item is already there", () => {
        expect(restoreAt([a, b, c], b, 1)).toEqual([a, b, c])
    })

    it("appends when the old position no longer exists", () => {
        expect(restoreAt([a], c, 5)).toEqual([a, c])
    })
})