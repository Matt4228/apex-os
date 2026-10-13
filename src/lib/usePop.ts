import { useState } from "react"

/**
 * Which check was just ticked, so only that one plays its pop: not the ones already done when the page loads.
 * start(key) when something is checked on, end() from onAnimationEnd. One component can track many keys
 */
export function usePop() {
    const [popping, setPopping] = useState<string | null>(null)
    return {
        start: (key = "") => setPopping(key),
        end: () => setPopping(null),
        /** The class to add while `key` pops; reduced motion turns it off */
        className: (key = "") => (popping === key ? "motion-safe:animate-check-pop" : ""),
    }
}
