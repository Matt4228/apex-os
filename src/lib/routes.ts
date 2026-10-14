/** Where the proxy sends a request: on to the page, to the dashboard, or to sign in */
export type Route = "next" | "/dashboard" | "/login"

// The welcome screen and its two other addresses; a signed-in visitor has no use for them
const PUBLIC_PAGES = ["/", "/login", "/register"]
// next-auth's own routes and the cron job check their own credentials; an invite link works signed in or out
const ALWAYS_OPEN = ["/api/auth", "/api/cron", "/join"]

export function routeFor(pathname: string, isLoggedIn: boolean): Route {
    if (ALWAYS_OPEN.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return "next"
    if (PUBLIC_PAGES.includes(pathname)) return isLoggedIn ? "/dashboard" : "next"
    return isLoggedIn ? "next" : "/login"
}

/**
 * Where to go after signing in: back to an invite link the visitor started from, otherwise the dashboard. Only
 * /join/ paths on this site are allowed, so a crafted link can't send someone elsewhere (an open redirect)
 */
export function afterSignIn(next: string | null | undefined): string {
    return typeof next === "string" && /^\/join\/[A-Za-z0-9]{1,32}$/.test(next) ? next : "/dashboard"
}
