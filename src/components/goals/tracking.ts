import type { Tracking } from "@/lib/goalProgress"

/** What each kind of numeric goal calls its value and its log action */
export const TRACKING_WORDS: Record<Tracking, { option: string; log: string; field: string; value: (amount: string) => string }> = {
    latest: { option: "Latest value, like your weight", log: "Update value", field: "New value", value: amount => `Now ${amount}` },
    total: { option: "Running total, like km run", log: "Add progress", field: "Amount to add", value: amount => `${amount} so far` },
    best: { option: "Personal best, like your longest run", log: "Log a result", field: "Result", value: amount => `Best ${amount}` },
}

export function trackingWords(tracking: string | undefined) {
    return TRACKING_WORDS[tracking as Tracking] ?? TRACKING_WORDS.latest
}

/** "12.5 km", or just "12.5" without a unit */
export function withUnit(value: number | null, unit: string | null): string {
    return unit ? `${value} ${unit}` : String(value)
}
