// tests/actions/auth.test.ts
import { registerUser } from "@/app/actions/auth"
import bcrypt from "bcryptjs"
import { describe, expect, it } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

function formDataFrom(entries: Record<string, string>): FormData {
    const formData = new FormData()
    for (const [key, value] of Object.entries(entries)) {
        formData.set(key, value)
    }
    return formData
}

const signup = (email = "matt@example.com", password = "password123", name = "Matt") =>
    registerUser(formDataFrom({ name, email, password }))

describe("registerUser", () => {
    it("rejects a short password without touching the database", async () => {
        expect(await signup("matt@example.com", "short")).toEqual({
            error: "Password must be at least 8 characters.",
        })
        expect(prismaMock.user.findFirst).not.toHaveBeenCalled()
        expect(prismaMock.user.create).not.toHaveBeenCalled()
    })

    // Each rule names its own problem, so a bad email never gets blamed on the password
    it("says when the email isn't an email", async () => {
        expect(await signup("matt.example.com")).toEqual({ error: "Enter a valid email address." })
        expect(prismaMock.user.create).not.toHaveBeenCalled()
    })

    it("says when the name is only spaces", async () => {
        expect(await signup("matt@example.com", "password123", "   ")).toEqual({ error: "Enter your name." })
        expect(prismaMock.user.create).not.toHaveBeenCalled()
    })

    it("says which field is missing when the form leaves one out", async () => {
        expect(await registerUser(formDataFrom({ name: "Matt", password: "password123" }))).toEqual({
            error: "Enter a valid email address.",
        })
    })

    it("saves the email trimmed and lowercased, with a hashed password", async () => {
        prismaMock.user.findFirst.mockResolvedValue(null)

        expect(await signup("  Matt@Example.COM ")).toEqual({ success: true })

        const data = prismaMock.user.create.mock.calls[0][0].data
        expect(data.email).toBe("matt@example.com")
        expect(data.password).not.toBe("password123")
        expect(await bcrypt.compare("password123", data.password as string)).toBe(true)
    })

    it("treats an existing account as taken whatever its capitalization", async () => {
        prismaMock.user.findFirst.mockResolvedValue({ id: "user-1" } as never)

        expect(await signup("MATT@example.com")).toEqual({ error: "An account with that email already exists." })
        expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
            where: { email: { equals: "matt@example.com", mode: "insensitive" } },
            select: { id: true },
        })
        expect(prismaMock.user.create).not.toHaveBeenCalled()
    })
})