// tests/lib/loginLimit.test.ts
import { verifyCredentials } from "@/lib/credentials"
import { limitKeys, isLimited, LoginLimited, recordFailure, MAX_PER_ACCOUNT, MAX_PER_IP, WINDOW_MS } from "@/lib/loginLimit"
import bcrypt from "bcryptjs"
import { describe, expect, it } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

const HASH = bcrypt.hashSync("password123", 4)
const savedUser = { id: "user-1", email: "matt@example.com", name: "Matt", password: HASH }
const from = (ip: string) => new Request("http://localhost/api/auth/callback/credentials", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } })

/** Failure counts for the account key and the IP key, in the order isLimited asks for them */
function failures(account: number, ip: number) {
    prismaMock.loginFailure.count.mockResolvedValueOnce(account).mockResolvedValueOnce(ip)
}

describe("limitKeys", () => {
    it("keys an account by email and address together, and an address on its own", () => {
        const a = limitKeys("matt@example.com", from("1.2.3.4"))
        expect(limitKeys("matt@example.com", from("5.6.7.8")).account).not.toBe(a.account)
        expect(limitKeys("someone@example.com", from("1.2.3.4")).ip).toBe(a.ip)
    })

    it("uses the first x-forwarded-for entry, which is the client", () => {
        expect(limitKeys("matt@example.com", from("1.2.3.4")).ip).toBe(
            limitKeys("matt@example.com", new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4" } })).ip,
        )
    })

    it("stores hashes, not emails or addresses", () => {
        const keys = limitKeys("matt@example.com", from("1.2.3.4"))
        for (const key of Object.values(keys)) {
            expect(key).toMatch(/^[0-9a-f]{64}$/)
            expect(key).not.toContain("matt")
            expect(key).not.toContain("1.2.3.4")
        }
    })
})

describe("isLimited", () => {
    const keys = limitKeys("matt@example.com", from("1.2.3.4"))

    it.each([
        [MAX_PER_ACCOUNT - 1, MAX_PER_IP - 1, false],
        [MAX_PER_ACCOUNT, 0, true],
        [0, MAX_PER_IP, true],
    ])("with %i account and %i address failures: %s", async (account, ip, limited) => {
        failures(account, ip)
        expect(await isLimited(keys)).toBe(limited)
    })

    it("only counts failures inside the window", async () => {
        failures(0, 0)
        const now = new Date("2026-10-22T12:00:00Z")

        await isLimited(keys, now)

        const since = new Date(now.getTime() - WINDOW_MS)
        expect(prismaMock.loginFailure.count).toHaveBeenCalledWith({ where: { key: keys.account, createdAt: { gte: since } } })
        expect(prismaMock.loginFailure.count).toHaveBeenCalledWith({ where: { key: keys.ip, createdAt: { gte: since } } })
    })
})

describe("recordFailure", () => {
    it("counts against both keys and prunes failures older than the window", async () => {
        const keys = limitKeys("matt@example.com", from("1.2.3.4"))
        const now = new Date("2026-10-22T12:00:00Z")

        await recordFailure(keys, now)

        expect(prismaMock.loginFailure.createMany).toHaveBeenCalledWith({ data: [{ key: keys.account }, { key: keys.ip }] })
        expect(prismaMock.loginFailure.deleteMany).toHaveBeenCalledWith({
            where: { createdAt: { lt: new Date(now.getTime() - WINDOW_MS) } },
        })
    })
})

describe("verifyCredentials with the limit", () => {
    it("refuses once the limit is reached, before looking up the user or checking the password", async () => {
        failures(MAX_PER_ACCOUNT, 0)

        await expect(verifyCredentials({ email: "matt@example.com", password: "password123" }, from("1.2.3.4"))).rejects.toThrow(
            LoginLimited,
        )
        expect(prismaMock.user.findFirst).not.toHaveBeenCalled()
    })

    it("records a wrong password", async () => {
        failures(0, 0)
        prismaMock.user.findFirst.mockResolvedValue(savedUser as never)

        expect(await verifyCredentials({ email: "matt@example.com", password: "wrong-password" }, from("1.2.3.4"))).toBeNull()
        expect(prismaMock.loginFailure.createMany).toHaveBeenCalledTimes(1)
    })

    it("records an unknown email the same way, so the limit can't tell anyone which emails exist", async () => {
        failures(0, 0)
        prismaMock.user.findFirst.mockResolvedValue(null)

        expect(await verifyCredentials({ email: "nobody@example.com", password: "password123" }, from("1.2.3.4"))).toBeNull()
        expect(prismaMock.loginFailure.createMany).toHaveBeenCalledTimes(1)
    })

    it("clears the account's failures after a correct password, and leaves the address's", async () => {
        failures(2, 7)
        prismaMock.user.findFirst.mockResolvedValue(savedUser as never)
        const keys = limitKeys("matt@example.com", from("1.2.3.4"))

        expect(await verifyCredentials({ email: "matt@example.com", password: "password123" }, from("1.2.3.4"))).toEqual({
            id: "user-1",
            email: "matt@example.com",
            name: "Matt",
        })
        expect(prismaMock.loginFailure.deleteMany).toHaveBeenCalledWith({ where: { key: keys.account } })
        expect(prismaMock.loginFailure.createMany).not.toHaveBeenCalled()
    })

    it("never touches the counters for malformed input", async () => {
        expect(await verifyCredentials({ email: "not-an-email", password: "password123" }, from("1.2.3.4"))).toBeNull()
        expect(prismaMock.loginFailure.count).not.toHaveBeenCalled()
        expect(prismaMock.loginFailure.createMany).not.toHaveBeenCalled()
    })
})
