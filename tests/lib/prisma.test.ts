import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.unmock("@/lib/prisma")
vi.mock("pg", () => ({
    Pool: vi.fn().mockImplementation(function () { return {} }),
}))
vi.mock("@prisma/adapter-pg", () => ({
    PrismaPg: vi.fn().mockImplementation(function () { return {} }),
}))
vi.mock("@prisma/client", () => ({
    PrismaClient: vi.fn().mockImplementation(function () { return {} }),
}))

describe("prisma singleton guard", () => {
    beforeEach(() => {
        vi.resetModules()
        delete (globalThis as { prisma?: unknown }).prisma
    })

    afterEach(() => {
        vi.unstubAllEnvs()
        delete (globalThis as { prisma?: unknown }).prisma
    })

    it("does not cache the client on globalThis in production", async () => {
        vi.stubEnv("NODE_ENV", "production")

        await import("@/lib/prisma")

        expect((globalThis as { prisma?: unknown }).prisma).toBeUndefined()
    })

    it("caches the client on globalThis outside production", async () => {
        vi.stubEnv("NODE_ENV", "development")

        await import("@/lib/prisma")

        expect((globalThis as { prisma?: unknown }).prisma).toBeDefined()
    })
})