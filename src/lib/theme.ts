export const THEME_COOKIE = "theme"

export type Theme = "dark" | "light"

/** Light unless the user has chosen dark. Unknown values fall back to light. */
export function parseTheme(value: string | undefined): Theme {
    return value === "dark" ? "dark" : "light"
}

/** The request header the proxy sets to the page's path, since the root layout can't read the URL itself */
export const PATH_HEADER = "x-pathname"

// The welcome pages a signed-out visitor sees: always light, so a first visit looks the way it was designed
const LIGHT_ONLY = new Set(["/", "/login", "/register"])

/** The theme for a page: light on the welcome pages, otherwise the saved choice */
export function themeFor(path: string | null | undefined, saved: string | undefined): Theme {
    return path && LIGHT_ONLY.has(path) ? "light" : parseTheme(saved)
}
