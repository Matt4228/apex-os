"use client"

import { useSyncExternalStore } from "react"
import { format } from "date-fns"
import { formatDateOnly } from "@/lib/dates"

const noChanges = () => () => {}

/** False on the server and the browser's first render, true after: for anything that must match on both first */
export function useInBrowser(): boolean {
    return useSyncExternalStore(noChanges, () => true, () => false)
}

/**
 * A moment in time (like when an entry was logged) shown in the viewer's timezone. The server can't know
 * that timezone, so the server and the browser's first render both use the UTC day, then the browser
 * switches to its own. Without this, an evening entry renders one day on the server and another in the
 * browser, and React reports a hydration mismatch
 */
export function LocalDate({ date, pattern }: { date: Date | string; pattern: string }) {
    const inBrowser = useInBrowser()
    return <>{inBrowser ? format(new Date(date), pattern) : formatDateOnly(date, pattern)}</>
}
