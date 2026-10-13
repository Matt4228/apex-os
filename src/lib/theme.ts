export const THEME_COOKIE = "theme"

export type Theme = "dark" | "light"

/** Light unless the user has chosen dark. Unknown values fall back to light. */
export function parseTheme(value: string | undefined): Theme {
    return value === "dark" ? "dark" : "light"
}