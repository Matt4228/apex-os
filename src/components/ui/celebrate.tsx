// Pieces of a celebration. All decoration: hidden from screen readers, never in the way of a click, and gone under
// reduced motion, where the change they celebrate still shows on its own

const DISTANCE = ["motion-safe:animate-burst-near", "motion-safe:animate-burst-mid", "motion-safe:animate-burst-far"]

/** A finished competition week's colors: gold first, then the hero's gold, gold ink and the competition's own color */
export const GOLD = ["var(--color-win)", "var(--color-hero-gold)", "var(--color-win-ink)", "var(--cat-solid)"]

/**
 * Bits flying out from the middle of the nearest positioned parent. `small` is a task's quiet version: six tiny
 * sparks in one color instead of a burst of confetti
 */
export function Burst({ colors, count = 16, small = false }: { colors: string[]; count?: number; small?: boolean }) {
    return (
        <span data-testid="burst" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-0 w-0 motion-reduce:hidden">
            {Array.from({ length: count }, (_, i) => (
                // Each ray points its own way; the bit inside flies straight out along it
                <span key={i} className="absolute left-0 top-0" style={{ transform: `rotate(${(360 / count) * i + (small ? 0 : (i % 3) * 7)}deg)` }}>
                    <span
                        className={`absolute opacity-0 ${
                            small ? "-left-0.5 -top-0.5 h-1 w-1 rounded-full motion-safe:animate-spark" : `-left-[3px] -top-[3px] h-1.5 w-1.5 ${DISTANCE[i % 3]}`
                        } ${!small && i % 2 === 0 ? "rounded-[1px]" : "rounded-full"}`}
                        style={{ background: colors[i % colors.length], animationDelay: small ? undefined : `${(i % 4) * 25}ms` }}
                    />
                </span>
            ))}
        </span>
    )
}

/** A ring spreading out from what was clicked; it takes the text color, and the shape from `className` */
export function Shockwave({ className = "" }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-px border-2 border-current opacity-0 motion-safe:animate-shockwave motion-reduce:hidden ${className}`}
        />
    )
}

/** Confetti falling from the top of the nearest positioned parent, which should clip it */
export function ConfettiFall({ colors, count = 26 }: { colors: string[]; count?: number }) {
    return (
        <span data-testid="confetti" aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 motion-reduce:hidden">
            {Array.from({ length: count }, (_, i) => (
                <span
                    key={i}
                    className={`absolute -top-3.5 h-[11px] w-[7px] rounded-[1px] opacity-0 ${
                        i % 2 ? "motion-safe:animate-fall-left" : "motion-safe:animate-fall-right"
                    }`}
                    // Spread across the width and over half a second, in a fixed pattern so it renders the same on the server
                    style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${150 + ((i * 53) % 500)}ms` }}
                />
            ))}
        </span>
    )
}

/** The tick inside a done task's circle. `draw` draws it in, for the task just checked off */
export function CheckMark({ draw = false }: { draw?: boolean }) {
    return (
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
            <path
                d="M2.5 6.3 5 8.6 9.5 3.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={draw ? "[stroke-dasharray:18] motion-safe:animate-check-draw" : ""}
            />
        </svg>
    )
}

/** A line sweeping through a just-finished task's title; its parent should be positioned and hug the text */
export function Strike() {
    return <span data-testid="strike" aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 h-[1.5px] w-full bg-ink-muted motion-safe:animate-strike" />
}