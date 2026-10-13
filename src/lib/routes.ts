/** Where the proxy sends a request: on to the page, to the dashboard, or to sign in */
export type Route = "next" | "/dashboard" | "/login"

// The welcome screen and its two other addresses; a signed-in visitor has no use for them
const PUBLIC_PAGES = ["/", "/login", "/register"]
// next-auth's own routes and the cron job check their own credentials
const ALWAYS_OPEN = ["/api/auth", "/api/cron"]

export function routeFor(pathname: string, isLoggedIn: boolean): Route {
    if (ALWAYS_OPEN.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return "next"
    if (PUBLIC_PAGES.includes(pathname)) return isLoggedIn ? "/dashboard" : "next"
    return isLoggedIn ? "next" : "/login"
}
