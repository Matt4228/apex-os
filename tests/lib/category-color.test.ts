// tests/lib/category-color.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
    CATEGORY_HUES,
    ON_SOLID,
    CATEGORY_STEPS,
    STATUS_HUES,
    catProps,
    categoryHue,
    oklchStep,
    uniqueCategories,
    type Step,
    type Theme,
} from "@/lib/categoryColor"
import { describe, expect, it } from "vitest"

/** OKLCH to linear sRGB, clipped to the screen's range the way a browser shows it */
function linearRgb(l: number, c: number, hue: number) {
    const a = c * Math.cos((hue * Math.PI) / 180)
    const b = c * Math.sin((hue * Math.PI) / 180)
    const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
    const clip = (x: number) => Math.min(1, Math.max(0, x))
    return [
        clip(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
        clip(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
        clip(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
    ]
}

/** WCAG relative luminance, from linear sRGB */
const luminance = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

function contrast(one: number[], two: number[]) {
    const [hi, lo] = [luminance(one), luminance(two)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

const step = (theme: Theme, name: Step, hue: number) => {
    const { l, c } = CATEGORY_STEPS[theme][name]
    return linearRgb(l, c, hue)
}

// The card color in each theme, from globals.css
const SURFACE: Record<Theme, number[]> = { light: linearRgb(1, 0, 0), dark: linearRgb(0.205, 0.014, 290) }
const THEMES: Theme[] = ["light", "dark"]
const ALL_HUES = [...CATEGORY_HUES, ...Object.values(STATUS_HUES)]

describe("categoryHue", () => {
    it("gives the common categories fixed, different hues", () => {
        const names = ["Fitness", "Learning", "Health", "Wellness", "Work", "Career", "Finance", "Personal"]
        expect(names.map(categoryHue)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    })

    it("ignores case and stray spaces", () => {
        expect(categoryHue("  career ")).toBe(categoryHue("Career"))
        expect(categoryHue("CAREER")).toBe(5)
    })

    it("gives any other name the same hue every time, inside the palette", () => {
        for (const name of ["Side projects", "Family", "Music", "Travel", "Reading"]) {
            const hue = categoryHue(name)
            expect(hue).toBe(categoryHue(name))
            expect(hue).toBeGreaterThanOrEqual(0)
            expect(hue).toBeLessThan(CATEGORY_HUES.length)
        }
    })

    it("has no hue for a missing or blank category", () => {
        expect(categoryHue(null)).toBeNull()
        expect(categoryHue(undefined)).toBeNull()
        expect(categoryHue("   ")).toBeNull()
    })
})

describe("catProps", () => {
    it("sets data-cat for a category and nothing without one", () => {
        expect(catProps("Work")).toEqual({ "data-cat": 4 })
        expect(catProps(null)).toEqual({})
    })
})

describe("uniqueCategories", () => {
    it("keeps each category once, in the first spelling seen, sorted", () => {
        expect(uniqueCategories(["Work", " career", "work", null, "", "Career ", "Fitness"])).toEqual([
            "career",
            "Fitness",
            "Work",
        ])
    })
})

describe("palette contrast", () => {
    for (const theme of THEMES) {
        it(`keeps colored text readable on its tint and on cards (${theme})`, () => {
            for (const hue of ALL_HUES) {
                const ink = step(theme, "ink", hue)
                expect(contrast(ink, step(theme, "tint", hue)), `ink on tint, hue ${hue}`).toBeGreaterThanOrEqual(4.5)
                expect(contrast(ink, SURFACE[theme]), `ink on surface, hue ${hue}`).toBeGreaterThanOrEqual(4.5)
            }
        })

        it(`keeps text readable on a solid fill (${theme})`, () => {
            const onSolid = linearRgb(ON_SOLID.l, ON_SOLID.c, ON_SOLID.h)
            for (const hue of CATEGORY_HUES) {
                expect(contrast(onSolid, step(theme, "solid", hue)), `hue ${hue}`).toBeGreaterThanOrEqual(4.5)
            }
            // No category: the solid is ink-muted, with white text in light and dark text in dark
            const neutral = theme === "light" ? linearRgb(0.5, 0.018, 290) : linearRgb(0.68, 0.014, 290)
            const neutralText = theme === "light" ? linearRgb(1, 0, 0) : onSolid
            expect(contrast(neutralText, neutral), "no category").toBeGreaterThanOrEqual(4.5)
        })

        it(`keeps solid fills visible on cards (${theme})`, () => {
            for (const hue of CATEGORY_HUES) {
                expect(contrast(step(theme, "solid", hue), SURFACE[theme]), `hue ${hue}`).toBeGreaterThanOrEqual(3)
            }
        })
    }
})

describe("globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")

    it("gives each data-cat value the hue in the table", () => {
        CATEGORY_HUES.forEach((hue, i) => expect(css).toContain(`[data-cat="${i}"] { --cat-h: ${hue}; }`))
    })

    it("uses the table's lightness and chroma for every step in both themes", () => {
        for (const theme of THEMES) {
            for (const [name, { l, c }] of Object.entries(CATEGORY_STEPS[theme])) {
                expect(css).toContain(`--cat-${name}-l: ${l}; --cat-${name}-c: ${c};`)
            }
        }
    })

    it("sets the dark steps after the light ones, so dark wins (the two selectors weigh the same)", () => {
        const light = css.indexOf(`--cat-tint-l: ${CATEGORY_STEPS.light.tint.l};`)
        const dark = css.indexOf(`--cat-tint-l: ${CATEGORY_STEPS.dark.tint.l};`)
        expect(light).toBeGreaterThan(-1)
        expect(dark).toBeGreaterThan(light)
    })

    it("writes text on solid fills in the table's color", () => {
        expect(css).toContain(`--cat-on-solid: oklch(${ON_SOLID.l} ${ON_SOLID.c} ${ON_SOLID.h});`)
    })

    it("puts the priority chip and status text colors on the same steps", () => {
        for (const theme of THEMES) {
            for (const [status, hue] of Object.entries(STATUS_HUES)) {
                expect(css).toContain(`--color-${status}-tint: ${oklchStep(theme, "tint", hue)};`)
                expect(css).toContain(`--color-${status}-ink: ${oklchStep(theme, "ink", hue)};`)
            }
        }
    })
})
