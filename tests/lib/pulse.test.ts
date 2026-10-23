import { sendHeartbeat } from "@/lib/pulse"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("sendHeartbeat", () => {
    const fetchMock = vi.fn()

    beforeEach(() => {
        process.env.PULSE_URL = "https://pulse.test/"
        process.env.PULSE_KEY = "test-ingest-key"
        fetchMock.mockReset()
        fetchMock.mockResolvedValue(new Response(null, { status: 202 }))
        vi.stubGlobal("fetch", fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete process.env.PULSE_URL
        delete process.env.PULSE_KEY
    })

    it("posts the job and status to Pulse with the app's key", async () => {
        await sendHeartbeat("apex-reseed", "ok", { ms: 1200 })

        expect(fetchMock).toHaveBeenCalledOnce()
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe("https://pulse.test/ingest/heartbeat")
        expect(init.method).toBe("POST")
        expect(init.headers.authorization).toBe("Bearer test-ingest-key")
        expect(JSON.parse(init.body)).toEqual({ job: "apex-reseed", status: "ok", detail: { ms: 1200 } })
        expect(init.signal).toBeInstanceOf(AbortSignal)
    })

    it("sends nothing when PULSE_URL or PULSE_KEY is unset", async () => {
        delete process.env.PULSE_URL
        await sendHeartbeat("apex-reseed", "ok")
        process.env.PULSE_URL = "https://pulse.test"
        delete process.env.PULSE_KEY
        await sendHeartbeat("apex-reseed", "ok")

        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("sendHeartbeat never throws when fetch rejects", async () => {
        fetchMock.mockRejectedValue(new Error("network down"))
        await expect(sendHeartbeat("apex-reseed", "fail")).resolves.toBeUndefined()
    })

    it("logs a warning when Pulse rejects the key", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        fetchMock.mockResolvedValue(new Response(null, { status: 401 }))

        await sendHeartbeat("apex-reseed", "ok")

        expect(warn).toHaveBeenCalledWith(expect.stringContaining("401"))
        warn.mockRestore()
    })
})
