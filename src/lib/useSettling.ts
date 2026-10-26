import { useEffect, useRef, useState } from "react"

/** How long a just-finished task stays where it was, so its check can draw before it moves to the done ones */
export const SETTLE_MS = 450

/**
 * Tasks just checked off, held in their old place for a moment. settle(id, then) starts the wait and runs `then` once 
 * the task has moved; cancel(id) drops it (the save failed). Each task waits on its own, so checking off several in a
 * row never waits on the one before. With reduced motion there's no animation to wait for, so the task moves at once
 */
export function useSettling(ms = SETTLE_MS) {
    const [ids, setIds] = useState<string[]>([])
    const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

    useEffect(() => {
        const pending = timers.current
        return () => pending.forEach(clearTimeout)
    }, [])

    function stop(id: string) {
        clearTimeout(timers.current.get(id))
        timers.current.delete(id)
        setIds(current => current.filter(other => other !== id))
    }

    function settle(id: string, then?: () => void) {
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
            then?.()
            return
        }
        clearTimeout(timers.current.get(id))
        setIds(current => current.includes(id) ? current : [...current, id])
        timers.current.set(id, setTimeout(() => {
            stop(id)
            then?.()
        }, ms))
    }

    return { settling: (id: string) => ids.includes(id), settle, cancel: stop }
}