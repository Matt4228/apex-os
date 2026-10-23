import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"

/**
 * Limits password guessing. Failed sign-ins are counted in Postgres, since serverless functions share no memory.
 *
 * Two counters, each over the last 15 minutes:
 * - one account from one IP address: 5 failures. Counting by account alone would let anyone lock a person out,
 *   including the shared demo account, just by failing on purpose
 * - one IP address across every account: 20 failures, so one address can't try a password on many accounts
 *
 * Keys are hashed, so the table doesn't keep emails or IP addresses
 */
export const WINDOW_MS = 15 * 60 * 1000
export const MAX_PER_ACCOUNT = 5
export const MAX_PER_IP = 20

type Keys = { account: string; ip: string }

/** Thrown by verifyCredentials when a counter is full. auth.ts turns it into an error code the sign-in form shows */
export class LoginLimited extends Error {
    constructor() {
        super("Too many failed sign-ins")
    }
}

export function limitKeys(email: string, request?: Request): Keys {
    const ip = clientIp(request)
    return { account: hash(`account:${email}:${ip}`), ip: hash(`ip:${ip}`) }
}

/** True once either counter is full. Checked before the password, so a blocked guess costs no bcrypt work */
export async function isLimited(keys: Keys, now = new Date()) {
    const since = new Date(now.getTime() - WINDOW_MS)
    const [account, ip] = await Promise.all([
        prisma.loginFailure.count({ where: { key: keys.account, createdAt: { gte: since } } }),
        prisma.loginFailure.count({ where: { key: keys.ip, createdAt: { gte: since } } }),
    ])
    return account >= MAX_PER_ACCOUNT || ip >= MAX_PER_IP
}

/** Counts a failure against both keys, and clears out failures too old to count */
export async function recordFailure(keys: Keys, now = new Date()) {
    await prisma.loginFailure.createMany({ data: [{ key: keys.account }, { key: keys.ip }] })
    await prisma.loginFailure.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - WINDOW_MS) } } })
}

/** A correct password resets that account's counter. The IP counter stays, so it still catches guessing elsewhere */
export async function clearFailures(keys: Keys) {
    await prisma.loginFailure.deleteMany({ where: { key: keys.account } })
}

/**
 * The caller's address. On Vercel the first x-forwarded-for entry is the client, set by Vercel's edge.
 * Without one (local dev, tests) every request shares one bucket
 */
function clientIp(request?: Request) {
    return request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

function hash(value: string) {
    return createHash("sha256").update(value).digest("hex")
}
