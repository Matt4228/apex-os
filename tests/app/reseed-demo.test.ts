// tests/app/reseed-demo.test.ts
import { GET } from "@/app/api/cron/reseed-demo/route"
import { seedDemo } from "@/lib/demo/seedDemo"
import { sendHeartbeat } from "@/lib/pulse"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

vi.mock("@/lib/pulse", () => ({ sendHeartbeat: vi.fn() }))
// The real seed runs by default; a test can swap in a quick success with mockResolvedValueOnce
vi.mock("@/lib/demo/seedDemo", async importOriginal => {
    const real = await importOriginal<typeof import("@/lib/demo/seedDemo")>()
    return { ...real, seedDemo: vi.fn(real.seedDemo) }
})

function cronRequest() {
    return new NextRequest("http://localhost/api/cron/reseed-demo", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}`},
    })
}

describe("reseed-demo cron", () => {
    beforeEach(() => {
        vi.mocked(sendHeartbeat).mockReset()
        process.env.CRON_SECRET = "test-secret"
        prismaMock.user.upsert.mockResolvedValue({ id: "demo-1" } as never)
        prismaMock.goal.create.mockResolvedValue({ id: "goal-1" } as never)
        prismaMock.scheduleBlock.createManyAndReturn.mockResolvedValue([])
    })

    it("keeps the demo user's id stable instead of deleting the user", async () => {
        await GET(cronRequest())

        expect(prismaMock.user.deleteMany).not.toHaveBeenCalled()
        expect(prismaMock.user.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { email: "demo@apex-os.app" } })
        )
    })

    it("refuses every request when CRON_SECRET isn't set", async () => {
        delete process.env.CRON_SECRET
        const request = new NextRequest("http://localhost/api/cron/reseed-demo", {
            headers: { authorization: "Bearer undefined" },
        })

        const response = await GET(request)

        expect(response.status).toBe(401)
        expect(prismaMock.user.upsert).not.toHaveBeenCalled()
    })

    it("reseed success sends an ok heartbeat to Pulse", async () => {
        vi.mocked(seedDemo).mockResolvedValueOnce(undefined as never)

        const response = await GET(cronRequest())

        expect(response.status).toBe(200)
        expect(sendHeartbeat).toHaveBeenCalledOnce()
        expect(sendHeartbeat).toHaveBeenCalledWith("apex-reseed", "ok", expect.objectContaining({ ms: expect.any(Number) }))
    })

    it("reseed failure sends a fail heartbeat and still returns 500", async () => {
        prismaMock.user.upsert.mockRejectedValue(new Error("database is asleep"))

        const response = await GET(cronRequest())

        expect(response.status).toBe(500)
        expect(sendHeartbeat).toHaveBeenCalledOnce()
        expect(sendHeartbeat).toHaveBeenCalledWith("apex-reseed", "fail", expect.objectContaining({ error: "database is asleep" }))
    })

    it("unauthorized request sends nothing", async () => {
        const request = new NextRequest("http://localhost/api/cron/reseed-demo", {
            headers: { authorization: "Bearer wrong" },
        })

        const response = await GET(request)

        expect(response.status).toBe(401)
        expect(sendHeartbeat).not.toHaveBeenCalled()
    })
})