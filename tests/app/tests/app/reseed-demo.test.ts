// tests/app/reseed-demo.test.ts
import { GET } from "@/app/api/cron/reseed-demo/route"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it} from "vitest"
import { prismaMock } from "../../../mocks/prismaMock"

function cronRequest() {
    return new NextRequest("http://localhost/api/cron/reseed-demo", {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}`},
    })
}

describe("reseed-demo cron", () => {
    beforeEach(() => {
        process.env.CRON_SECRET = "test-secret"
        prismaMock.user.upsert.mockResolvedValue({ id: "demo-1" } as never)
        prismaMock.goal.create.mockResolvedValue({ id: "goal-1" } as never)
    })

    it("keeps the demo user's id stable instead of deleting the user", async () => {
        await GET(cronRequest())

        expect(prismaMock.user.deleteMany).not.toHaveBeenCalled()
        expect(prismaMock.user.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { email: "demo@apex-os.app" } })
        )
    })
})