// tests/lib/credentials.test.ts
import { verifyCredentials } from "@/lib/credentials"
import bcrypt from "bcryptjs"
import { describe, expect, it } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

// A low cost factor keeps the test fast; the app hashes with 12
const HASH = bcrypt.hashSync("password123", 4)
const savedUser = { id: "user-1", email: "Matt@Example.com", name: "Matt", password: HASH }

describe("verifyCredentials", () => {
    it("signs in whatever capitalization the email is typed or saved with", async () => {
        prismaMock.user.findFirst.mockResolvedValue(savedUser as never)

        const user = await verifyCredentials({ email: "  MATT@example.com ", password: "password123" })

        expect(user).toEqual({ id: "user-1", email: "Matt@Example.com", name: "Matt" })
        expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
            where: { email: { equals: "matt@example.com", mode: "insensitive" } },
        })
    })

    it("returns null for a wrong password", async () => {
        prismaMock.user.findFirst.mockResolvedValue(savedUser as never)

        expect(await verifyCredentials({ email: "matt@example.com", password: "wrong-password" })).toBeNull()
    })

    it("returns null for an unknown email", async () => {
        prismaMock.user.findFirst.mockResolvedValue(null)

        expect(await verifyCredentials({ email: "nobody@example.com", password: "password123" })).toBeNull()
    })

    it("returns null for malformed input without querying the database", async () => {
        expect(await verifyCredentials({ email: "not-an-email", password: "password123" })).toBeNull()
        expect(prismaMock.user.findFirst).not.toHaveBeenCalled()
    })
})