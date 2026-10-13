/**
 * Category colors. Every goal, habit and schedule block can have a free-text category; each category gets one of
 * eight hues, and each hue comes in four steps. globals.css holds the same numbers as CSS variables, and a test
 * keeps the two in step
 */

/** OKLCH hues, by palette index. Brand purple (290) and action teal (182) are left out on purpose */
export const CATEGORY_HUES = [40, 80, 120, 150, 220, 255, 320, 355] as const

export type Step = "tint" | "line" | "solid" | "ink"
export type Theme = "light" | "dark"

/**
 * Lightness and chroma for each step. Every hue shares them, so no category is louder than another.
 * tint: panels and chips. line: borders. solid: checks, bars and the day strip. ink: colored text
 */
export const CATEGORY_STEPS: Record<Theme, Record<Step, { l: number; c: number }>> = {
    light: {
        tint: { l: 0.962, c: 0.03 },
        line: { l: 0.87, c: 0.07 },
        solid: { l: 0.64, c: 0.15 },
        ink: { l: 0.47, c: 0.14 },
    },
    dark: {
        tint: { l: 0.27, c: 0.045 },
        line: { l: 0.4, c: 0.08 },
        solid: { l: 0.7, c: 0.14 },
        ink: { l: 0.83, c: 0.1 },
    },
}

/** The hues the priority chips and status text use, on the same steps as the categories */
export const STATUS_HUES = { danger: 25, warning: 55, success: 125 } as const

/** "oklch(0.962 0.03 40)": one step of one hue, written the way globals.css writes it */
export function oklchStep(theme: Theme, step: Step, hue: number) {
    const { l, c } = CATEGORY_STEPS[theme][step]
    return `oklch(${l} ${c} ${hue})`
}

// Common names get fixed hues, so the categories most people use never share a color
const KNOWN: Record<string, number> = {
    fitness: 0,
    learning: 1,
    health: 2,
    wellness: 3,
    work: 4,
    career: 5,
    finance: 6,
    personal: 7,
}

/** Which of the eight hues a category gets (0 to 7), or null for no category. Same name, same hue, everywhere */
export function categoryHue(name: string | null | undefined): number | null {
    const key = name?.trim().toLowerCase()
    if (!key) return null
    if (key in KNOWN) return KNOWN[key]

    let hash = 0
    for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    return hash % CATEGORY_HUES.length
}

/** Spread onto an element to color it and its children by category: bg-cat-tint, text-cat-ink and so on */
export function catProps(name: string | null | undefined): { "data-cat"?: number } {
    const hue = categoryHue(name)
    return hue === null ? {} : { "data-cat": hue }
}

/** Each category once, in the first spelling seen, sorted: the suggestions for a category input */
export function uniqueCategories(names: (string | null | undefined)[]): string[] {
    const byKey = new Map<string, string>()
    for (const name of names) {
        const trimmed = name?.trim()
        if (trimmed && !byKey.has(trimmed.toLowerCase())) byKey.set(trimmed.toLowerCase(), trimmed)
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b))
}
