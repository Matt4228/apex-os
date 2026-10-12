import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import HabitList from "@/components/habits/HabitList"
import { weekRangeOf } from "@/lib/dates"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"

export default async function HabitsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    
    // The user's calendar day, not the server's: on Vercel the server runs in UTC
    const today = await getUserToday()
    const { start: weekStart, end: weekEnd } = weekRangeOf(today)

    const habits = await prisma.habit.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            logs: {
                where: {
                    completedOn: {
                        gte: weekStart,
                        lt: weekEnd,
                    },
                },
            },
        },
    })
    
    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">Habits</h2>
                <p className="text-ink-muted text-sm mt-1">
                    {habits.filter(h => h.isActive).length} active habits this week
                </p>
            </div>

            <HabitList initialHabits={habits} today={today} />
        </main>
    )
}