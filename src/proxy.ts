import { auth } from "@/lib/auth"
import { routeFor } from "@/lib/routes"
import { PATH_HEADER } from "@/lib/theme"
import { NextResponse } from "next/server"

export default auth((req) => {
  const to = routeFor(req.nextUrl.pathname, !!req.auth)
  if (to !== "next") return NextResponse.redirect(new URL(to, req.nextUrl))
  // The root layout picks the theme by page, so it gets the path in a header
  const headers = new Headers(req.headers)
  headers.set(PATH_HEADER, req.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
}
