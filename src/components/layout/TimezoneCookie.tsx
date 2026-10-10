"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TIMEZONE_COOKIE } from "@/lib/dates"

// Tells the server the browser's timezone so today is the user's today, not the server's (UTC)
// Renders nothing: refreshes once if the cookie was missing or out of date
export default function TimezoneCookie() {
    const router = useRouter()

    useEffect(() => {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const current = document.cookie
            .split("; ")
            .find(c => c.startsWith(`{TIMEZONE_COOKIE}=`))
            ?.split("=")[1]

        if (current != encodeURIComponent(timeZone)) {
            document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; samesite=lax`
            router.refresh()
        }
    }, [router])

    return null
}