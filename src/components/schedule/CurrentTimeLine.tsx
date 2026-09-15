"use client"

import { useEffect, useState } from "react"
import { minutesToPixels } from "@/lib/schedule-time"

export default function CurrentTimeLine({ pxPerMinute }: { pxPerMinute: number }) {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000)
        return () => clearInterval(interval)
    }, [])

    const minutes = now.getHours() * 60 + now.getMinutes()
    const top = minutesToPixels(minutes, pxPerMinute)

    return (
        <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top }}>
            <div className="relative">
                <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                <div className="border-t-2 border-red-500" />
            </div>
        </div>
    )
}