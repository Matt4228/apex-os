"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import {
    CalendarDays, House, ListChecks, LogOut, Menu, Repeat, Target, Trophy, X, type LucideIcon,
} from "lucide-react"
import ThemeToggle from "@/components/layout/ThemeToggle"
import { Wordmark } from "@/components/layout/Wordmark"
import type { Theme } from "@/lib/theme"

const links: { href: string; label: string; icon: LucideIcon; also?: string[] }[] = [
    { href: "/dashboard", label: "Home", icon: House },
    { href: "/dashboard/tasks", label: "Tasks", icon: ListChecks },
    { href: "/dashboard/goals", label: "Goals", icon: Target },
    { href: "/dashboard/habits", label: "Habits", icon: Repeat },
    { href: "/dashboard/schedule", label: "Schedule", icon: CalendarDays },
    // Friends lives under Competitions: they're the people you compete with
    { href: "/dashboard/competitions", label: "Competitions", icon: Trophy, also: ["/dashboard/friends"] },
]

// Home only matches itself, since every route starts with /dashboard.
// Other sections stay marked on the pages nested under them
function isActive(pathname: string, href: string, also: string[] = []) {
    if (href === "/dashboard") return pathname === href
    return [href, ...also].some(path => pathname === path || pathname.startsWith(`${path}/`))
}

type SidebarProps = {
    userName?: string | null
    theme: Theme
    /** Friend requests and competition invites waiting for an answer, shown as a count on Competitions */
    waiting?: number
}

export default function Sidebar({ userName, theme, waiting = 0 }: SidebarProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuButtonRef = useRef<HTMLButtonElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)

    function closeMenu() {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
    }

    // While the drawer is open: focus starts on its close button, and Escape closes it
    useEffect(() => {
        if (!menuOpen) return
        closeButtonRef.current?.focus()

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setMenuOpen(false)
                menuButtonRef.current?.focus()
            }
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [menuOpen])

    return (
        <>
            {/* Desktop: always visible, stays put while the page scrolls */}
            <aside className="hidden md:flex md:sticky md:top-0 md:h-screen w-56 flex-shrink-0 flex-col border-r
border-line bg-surface">
                <SidebarContent userName={userName} theme={theme} waiting={waiting} />
            </aside>

            {/* Mobile: a slim top bar; the same content opens as a drawer */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-surface">
                <Link href="/dashboard">
                    <Wordmark />
                </Link>
                <button
                    ref={menuButtonRef}
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                    aria-expanded={menuOpen}
                    aria-controls="mobile-menu"
                    className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-sunken transition-colors"
                >
                    <Menu size={22} aria-hidden="true" />
                </button>
            </header>

            {/* Stays mounted while hidden so the theme toggle inside keeps its state between openings */}
            <div id="mobile-menu" hidden={!menuOpen} className="md:hidden fixed inset-0 z-40">
                <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    className="absolute inset-y-0 left-0 w-64 flex flex-col border-r border-line bg-surface"
                >
                    <button
                        ref={closeButtonRef}
                        onClick={closeMenu}
                        aria-label="Close menu"
                        className="absolute top-4 right-3 p-1.5 rounded-md text-ink-soft hover:text-ink
hover:bg-sunken transition-colors"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                    <SidebarContent userName={userName} theme={theme} waiting={waiting} onNavigate={() => setMenuOpen(false)} />
                </div>
            </div>
        </>
    )
}

function SidebarContent({ userName, theme, waiting = 0, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
    const pathname = usePathname()

    return (
        <>
            <Link href="/dashboard" onClick={onNavigate} className="px-5 py-5">
                <Wordmark className="text-lg" />
            </Link>

            <nav aria-label="Main" className="flex-1 flex flex-col gap-0.5 px-3">
                {links.map(({ href, label, icon: Icon, also }) => {
                    const active = isActive(pathname, href, also)
                    const count = href === "/dashboard/competitions" ? waiting : 0
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            aria-label={count > 0 ? `${label}, ${count} waiting` : undefined}
                            className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm
transition-colors ${
                                active
                                    ? "bg-sunken text-ink font-medium before:absolute before:left-0 before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-primary-ink"
                                    : "text-ink-soft hover:text-ink hover:bg-sunken"
                            }`}
                        >
                            <Icon size={18} aria-hidden="true" />
                            {label}
                            {count > 0 && (
                                // The link's own label says it in words; the number is for the eye
                                <span aria-hidden="true" className="ml-auto rounded-full bg-primary-ink px-1.5 text-[11px] font-semibold leading-5 text-surface tabular-nums">
                                    {count}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
                {userName && (
                    <p className="px-3 py-1 text-xs text-ink-muted truncate">{userName}</p>
                )}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-soft hover:text-ink
hover:bg-sunken transition-colors"
                    >
                        <LogOut size={18} aria-hidden="true" />
                        Sign out
                    </button>
                    <ThemeToggle initialTheme={theme} />
                </div>
            </div>
        </>
    )
}