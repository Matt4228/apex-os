"use client"

import { useState } from "react"
import { Moon, Sun } from "lucide-react"
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
            className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-sunken transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ink">
            {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
    )
}