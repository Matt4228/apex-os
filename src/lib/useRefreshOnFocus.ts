"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Reloads the page's server data when the tab comes back into view, so other people's progress catches up */
export function useRefreshOnFocus() {
    const router = useRouter()

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === "visible") router.refresh()
        }
        document.addEventListener("visibilitychange", onVisible)
        return () => document.removeEventListener("visibilitychange", onVisible)
    }, [router])
}
