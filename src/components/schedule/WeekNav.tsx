"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatDateOnly } from "@/lib/dates"
import { addDays, weekDates } from "@/lib/occurrences"

const PAGE = "/dashboard/schedule"
const weekHref = (sunday: string) => `${PAGE}?week=${sunday}`

const button =
    "inline-flex h-9 items-center justify-center rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink-soft hover:border-line-strong hover:text-ink transition-colors"

/**
 * Previous, Today and Next, the week's dates, and a date box to jump anywhere. The week lives in the address,
 * so a refresh or a shared link opens the same week
 */
export default function WeekNav({ sunday, today }: { sunday: string; today: string }) {
    const router = useRouter()
    const saturday = addDays(sunday, 6)
    const isThisWeek = weekDates(today)[0] === sunday

    return (
        <nav aria-label="Weeks" className="flex flex-wrap items-center gap-2">
            <Link href={weekHref(addDays(sunday, -7))} aria-label="Previous week" className={`${button} px-2`}>
                <ChevronLeft size={16} aria-hidden="true" />
            </Link>
            <Link
                href={PAGE}
                aria-current={isThisWeek ? "date" : undefined}
                className={`${button} ${isThisWeek ? "text-primary-ink" : ""}`}
            >
                Today
            </Link>
            <Link href={weekHref(addDays(sunday, 7))} aria-label="Next week" className={`${button} px-2`}>
                <ChevronRight size={16} aria-hidden="true" />
            </Link>

            <h3 className="ml-1 text-base font-semibold text-ink tabular-nums">
                {formatDateOnly(sunday, "MMM d")} to {formatDateOnly(saturday, "MMM d, yyyy")}
            </h3>

            <input
                type="date"
                aria-label="Jump to date"
                // Keyed by the week, so after a jump the box shows the new week's Sunday
                key={sunday}
                defaultValue={sunday}
                onChange={e => e.target.value && router.push(weekHref(e.target.value))}
                className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink"
            />
        </nav>
    )
}
