"use client"

import { useState } from "react"
import { THEME_COOKIE, type Theme } from "@/lib/theme"

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

export default function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
    const [theme, setTheme] = useState(initialTheme)
    const next: Theme = theme === "dark" ? "light" : "dark"

    function toggle() {
        setTheme(next)
        // Update the page now, and remember it so the server renders this theme next time
        document.documentElement.dataset.theme = next
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`
    }

    return (
        <button
            onClick={toggle}
            aria-label={`Switch to ${next} theme`}
            title={`Switch to ${next} theme`}
            className="p-1 rounded-md text-white/60 hover:text-white transition-colors focus:outline-none
focus-visible:ring-2 focus-visible:ring-white"
        >
            {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93
19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            )}
        </button>
    )
}