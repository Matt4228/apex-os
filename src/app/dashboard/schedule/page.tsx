import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ScheduleGrid from "@/components/schedule/ScheduleGrid"
import WeekNav from "@/components/schedule/WeekNav"
import { weekDates } from "@/lib/occurrences"
import { weekStartFor } from "@/lib/weekParam"
import { loadBlocks } from "@/lib/scheduleData"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    // The week in the address (?week=2026-10-11, any day of it), or this week. Blocks that can show in it, and
    // their changed days
    const today = await getUserToday()
    const sunday = weekStartFor((await searchParams).week, today)
    const days = weekDates(sunday)
    const { blocks, exceptions } = await loadBlocks(session.user.id, days[0], days[6])

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-ink">Schedule</h2>
                <p className="text-ink-muted text-sm mt-1">Repeating blocks fill every week they apply to.</p>
            </div>

            <WeekNav sunday={sunday} today={today} />

            {/* A new week is a new grid: the key starts it fresh with that week's blocks */}
            <ScheduleGrid key={sunday} initialBlocks={blocks} initialExceptions={exceptions} days={days} today={today} />
        </main>
    )
}