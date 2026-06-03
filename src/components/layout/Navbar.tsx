"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"

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
  const [menuOpen, setMenuOpen] = useState(false)

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
          <button 
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden text-white/80 hover:text-white p-1"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === link.href
                  ? "bg-white/20 text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center justify-between px-3 py-2 mt-1 border-t border-white/10">
            {userName && (
              <span className="text-sm text-white/60">{userName}</span>
            )}
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-white/60 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}