"use client"

import { minutesToPixels } from "@/lib/schedule-time"
import { useMinutesNow } from "@/lib/useMinutesNow"

/**
 * A line at the current time, in brand purple. The server doesn't know the visitor's clock, so the line appears
 * once the page is running in the browser
 */
export default function CurrentTimeLine({ pxPerMinute }: { pxPerMinute: number }) {
    const minutes = useMinutesNow()
    if (minutes === null) return null

    return (
        <div data-testid="now-line" className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: minutesToPixels(minutes, pxPerMinute) }}>
            <div className="relative">
                <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-primary-ink" />
                <div className="border-t-2 border-primary-ink" />
            </div>
        </div>
    )
}
