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
