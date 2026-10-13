import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ScheduleGrid from "@/components/schedule/ScheduleGrid"
import { formatDateOnly } from "@/lib/dates"
import { weekDates } from "@/lib/occurrences"
import { loadBlocks } from "@/lib/scheduleData"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"

export default async function SchedulePage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    // This week on the user's calendar: blocks that can show in it, and their changed days
    const today = await getUserToday()
    const days = weekDates(today)
    const { blocks, exceptions } = await loadBlocks(session.user.id, days[0], days[6])

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">Schedule</h2>
                <p className="text-ink-muted text-sm mt-1">
                    {formatDateOnly(days[0], "MMM d")} to {formatDateOnly(days[6], "MMM d, yyyy")}. Repeating blocks fill
                    every week they apply to.
                </p>
            </div>

            <ScheduleGrid initialBlocks={blocks} initialExceptions={exceptions} days={days} today={today} />
        </main>
    )
}