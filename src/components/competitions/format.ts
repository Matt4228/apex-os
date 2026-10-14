/** "12.5 km", "3 workouts" or "3": a number with what it counts, to one decimal */
export function amountText(value: number, unit: string | null) {
    const rounded = Math.round(value * 10) / 10
    return unit ? `${rounded} ${unit}` : String(rounded)
}
