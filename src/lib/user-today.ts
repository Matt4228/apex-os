import { cookies, headers } from "next/headers"
import { TIMEZONE_COOKIE, todayIn } from "./dates"

/**
 * Today's calendar day in the user's timezone. Perfers the browser-reported cookie,
 * then Vercel's IP-based guess (first visit, before the cookie exists), then UTC
 */
export async function getUserToday(): Promise<string> {
    const cookieStore = await cookies()
    const headerStore = await headers()
    const timeZone = 
        cookieStore.get(TIMEZONE_COOKIE)?.value ??
        headerStore.get("x-vercel-ip-timezone") ??
        "UTC"
    return todayIn(timeZone)
}