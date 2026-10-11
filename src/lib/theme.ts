export const THEME_COOKIE = "theme"

export type Theme = "dark" | "light"

/** Dark unless the user has chosen light. Unknown values fall back to dark. */
export function parseTheme(value: string | undefined): Theme {
    return value === "light" ? "light" : "dark"
}