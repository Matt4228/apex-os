/**
 * Reports job results to Pulse, the monitoring service for these projects
 * (https://github.com/Matt4228/pulse). Pulse alerts when the nightly demo
 * reseed fails or doesn't check in by 06:30 UTC.
 *
 * Reporting must never break the job: a 3 second timeout, every error is
 * swallowed, and nothing is sent unless PULSE_URL and PULSE_KEY are both set
 * (so local dev and tests send nothing).
 */

const TIMEOUT_MS = 3000

export type HeartbeatStatus = "ok" | "fail"

export async function sendHeartbeat(
    job: "apex-reseed",
    status: HeartbeatStatus,
    detail?: Record<string, unknown>
): Promise<void> {
    const url = process.env.PULSE_URL
    const key = process.env.PULSE_KEY
    if (!url || !key) return

    try {
        const res = await fetch(`${url.replace(/\/+$/, "")}/ingest/heartbeat`, {
            method: "POST",
            headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
            body: JSON.stringify({ job, status, detail }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        // Usually a wrong or missing PULSE_KEY; worth seeing in the Vercel logs
        if (!res.ok) console.warn(`Pulse rejected the ${job} heartbeat with ${res.status}`)
    } catch {
        // Monitoring is best-effort. A Pulse outage must not fail the reseed
    }
}
