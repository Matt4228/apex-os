import { Crown } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import type { Standing } from "@/lib/standings"
import { ordinal } from "./format"

// Step heights by place: 1st stands tallest
const STEP: Record<number, string> = { 1: "h-16", 2: "h-11", 3: "h-8" }

// Where each of the top three is drawn, left to right: 2nd, 1st, 3rd. The list itself stays in place order for screen readers
const SPOT = ["order-2", "order-1", "order-3"]

/**
 * The top three on steps, drawn for the dark hero panel: 1st in the middle, raised, with a crown; 2nd on the left,
 * 3rd on the right. People tied share a place, so a tie for 1st puts two people on the top step
 */
export default function Podium({ standings }: { standings: Standing[] }) {
    const top = standings.slice(0, 3)

    return (
        <ol aria-label="Podium" className="grid w-full max-w-xs grid-flow-col auto-cols-fr items-end gap-2">
            {top.map((row, i) => {
                const first = row.place === 1
                const name = row.isYou ? "You" : row.name.split(" ")[0]
                return (
                    <li key={row.participantId} aria-label={`${ordinal(row.place)} ${name}`} className={`${SPOT[i]} flex min-w-0 flex-col items-center gap-1 text-center`}>
                        <span className="flex h-4 items-center text-hero-gold">
                            {first && <Crown size={14} role="img" aria-label="Leader" />}
                        </span>
                        <Avatar
                            name={row.name}
                            initials={row.initials}
                            size={first ? "lg" : "md"}
                            className={first ? "ring-2 ring-hero-gold ring-offset-2 ring-offset-hero" : "ring-2 ring-hero-line ring-offset-2 ring-offset-hero"}
                        />
                        <span className="max-w-full truncate text-sm font-semibold">{name}</span>
                        <span aria-hidden="true" className="font-mono text-[11px] text-hero-soft tabular-nums">
                            {row.season.completedWeeks} wks · {Math.round(row.season.totalProgress)}%
                        </span>
                        <span
                            aria-hidden="true"
                            className={`flex w-full items-center justify-center rounded-t-lg rounded-b-sm border font-extrabold ${STEP[row.place] ?? STEP[3]} ${
                                first ? "border-win/50 bg-win/20 text-hero-gold" : "border-hero-line bg-hero-ink/10 text-hero-soft"
                            }`}
                        >
                            {row.place}
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}
