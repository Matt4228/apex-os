import { auth } from "@/lib/auth"
import { routeFor } from "@/lib/routes"
import { NextResponse } from "next/server"

export default auth((req) => {
  const to = routeFor(req.nextUrl.pathname, !!req.auth)
  return to === "next" ? NextResponse.next() : NextResponse.redirect(new URL(to, req.nextUrl))
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
