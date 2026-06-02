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
    <nav className="bg-primary px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-white">
            Apex OS
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-white/20 text-white font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {userName && (
            <span className="text-sm text-white/60 hidden md:block">{userName}</span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-md border border-white/20 hover:border-white/40 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}