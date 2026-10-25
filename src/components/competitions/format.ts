import type { Standing } from "@/lib/standings"

/** "pages" for most amounts, "page" for exactly one */
const counted = (word: string, amount: number) => (amount === 1 && word.length > 2 && word.endsWith("s") ? word.slice(0, -1) : word)

/** "12.5 km", "1 page" or "3": a number with what it counts, to one decimal */
export function amountText(value: number, unit: string | null) {
    const rounded = Math.round(value * 10) / 10
    return unit ? `${rounded} ${counted(unit, rounded)}` : String(rounded)
}

/**
 * What's left of a metric: "3 km", or with no unit the metric's name, "2 workouts" and "1 workout"
 */
export function leftText(amount: number, metric: { name: string; unit: string | null }) {
    if (metric.unit) return amountText(amount, metric.unit)
    const rounded = Math.round(amount * 10) / 10
    return `${rounded} ${counted(metric.name.toLowerCase(), rounded)}`
}


/** "1st", "2nd", "3rd", "4th", "11th", "21st" */
export function ordinal(n: number) {
    const tens = n % 100
    const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"
    return `${n}${suffix}`
}

const weeksText = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`

/** "12 points", "1 point", or under half a point (still enough to split two places) "less than a point" */
function pointsText(gap: number) {
    const n = Math.round(gap)
    return n === 0 ? "less than a point" : `${n} ${n === 1 ? "point" : "points"}`
}

/**
 * Your place and the gap that matters: to the person just ahead, or when you lead, to the person in 2nd. In weeks when
 * completed weeks differ, otherwise in points of total progress (the tie-breaker). "You're 2nd, 23 points behind Sam."
 * Once it's over, "You finished 2nd, 23 points behind Sam."
 */
export function standingText(ranked: Standing[], finished = false): string {
    const you = ranked.find(r => r.isYou)
    if (!you) return ""
    const lead = finished ? "You finished" : "You're"
    const tiedWith = ranked.find(r => !r.isYou && r.place === you.place)
    if (tiedWith) return `${lead} tied for ${ordinal(you.place)} with ${tiedWith.name.split(" ")[0]}.`

    const i = ranked.indexOf(you)
    const other = you.place === 1 ? ranked[i + 1] : ranked[i - 1]
    if (!other) return `${lead} ${ordinal(you.place)}.`
    const weeks = Math.abs(you.season.completedWeeks - other.season.completedWeeks)
    const gap = weeks > 0 ? weeksText(weeks) : pointsText(Math.abs(you.season.totalProgress - other.season.totalProgress))
    const name = other.name.split(" ")[0]
    return you.place === 1 ? `${lead} 1st, ${gap} ahead of ${name}.` : `${lead} ${ordinal(you.place)}, ${gap} behind ${name}.`
}
