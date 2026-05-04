"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const links = [
    { href: "/dashboard", label: "Home" },
    { href: "/dashboard/tasks", label: "Tasks" },
    { href: "/dashboard/goals", label: "Goals" },
    { href: "/dashboard/habits", label: "Habits" },
    { href: "/dashboard/schedule", label: "Schedule" },
    { href: "/dashboard/competitions", label: "Competitions" },
]

export default function Navbar({ userName }: { userName?: string | null }) {
    const pathname = usePathname()

    return (
        <nav className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="max-w-5x1 mx-auto flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
                        Apex OS
                    </Link>
                    <div className="hidden md:flex items-center gap-1">
                        {links.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                                    pathname === link.href
                                        ? "bg-slate-100 text-slate-900 font-medium"
                                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {userName && (
                        <span className="text-sm text-slate-500 hidden md:block">{userName}</span>
                    )}
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-sm text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </nav>
    )
}