import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import HabitList from "@/components/habits/HabitList"
import { startOfWeek, endOfWeek } from "date-fns"

export const dynamic = "force-dynamic"

export default async function HabitsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 })

    const habits = await prisma.habit.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            logs: {
                where: {
                    completedOn: {
                        gte: weekStart,
                        lte: weekEnd,
                    },
                },
            },
        },
    })
    
    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-4">
                <h1 className="text-lg font-semibold text-slate-900">Apex OS</h1>
            </nav>

            <main className="max-w-2x1 mx-auto px-6 py-10">
                <div className="mb-8">
                    <h2 className="text-2x1 font-semibold text-slate-900">Habits</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {habits.filter(h => h.isActive).length} active habits this week
                    </p>
                </div>

                <HabitList initialHabits={habits} />
            </main>
        </div>
    )
}