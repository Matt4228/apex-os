import { useEffect, useState } from "react"

/**
 * A value that holds for `ms` and then clears itself: what's being celebrated right now, so the burst and the rest
 * play once and leave nothing behind. flash(value) starts it again, flash(null) stops it early
 */
export function useFlash<T>(ms: number): [T | null, (value: T | null) => void] {
    const [value, setValue] = useState<T | null>(null)

    useEffect(() => {
        if (value === null) return
        const timer = setTimeout(() => setValue(null), ms)
        return () => clearTimeout(timer)
    }, [value, ms])

    return [value, setValue]
}