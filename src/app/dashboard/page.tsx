import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDateOnly, parseDateOnly, toDateInputValue, weekRangeOf } from "@/lib/dates"
import { getUserToday } from "@/lib/user-today"
import TodayBoard from "@/components/today/TodayBoard"
import TodayHabits from "@/components/today/TodayHabits"
import TodaySchedule from "@/components/today/TodaySchedule"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const userId = session.user.id
    const today = await getUserToday()
    const todayDate = parseDateOnly(today)
    const { start: weekStart, end: weekEnd } = weekRangeOf(today)
    const dayOfWeek = formatDateOnly(todayDate, "EEEE")

    const [tasks, goals, habits, scheduleBlocks] = await Promise.all([
        // Everything still open (for suggestions and goal steps), plus anything finished from today's plan
        prisma.task.findMany({
            where: { userId, OR: [{ status: "todo" }, { plannedFor: todayDate }] },
            include: { goal: { select: { id: true, title: true } } },
        }),
        prisma.goal.findMany({
            where: { userId, status: "active" },
            select: { id: true, title: true, status: true },
            orderBy: { createdAt: "asc" },
        }),
        prisma.habit.findMany({
            where: { userId, isActive: true },
            orderBy: { createdAt: "asc" },
            include: {
                logs: {
                    where: { completedOn: { gte: weekStart, lt: weekEnd } },
                    select: { completedOn: true },
                },
            },
        }),
        prisma.scheduleBlock.findMany({
            where: { userId, dayOfWeek },
            // "HH:MM" text sorts in time order because hours are zero padded
            orderBy: { startTime: "asc" },
        }),
    ])

    const habitItems = habits.map(habit => ({
        id: habit.id,
        title: habit.title,
        targetPerWeek: habit.targetPerWeek,
        weekCount: habit.logs.length,
        doneToday: habit.logs.some(log => toDateInputValue(log.completedOn) === today),
    }))

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <header className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">{formatDateOnly(todayDate, "EEEE, MMMM d")}</h2>
                <p className="text-ink-muted text-sm mt-1">
                    Welcome back, {session.user?.name?.split(" ")[0] ?? "there"}
                </p>
            </header>

            {/* One grid: on mobile everything stacks by `order` (schedule, plan, habits, suggestions);
                on desktop the plan and suggestions fill column 1 and the rail fills column 2 */}
            <div className="grid gap-x-12 gap-y-10 md:grid-cols-[minmax(0,1fr)_17rem] md:items-start">
                <TodaySchedule blocks={scheduleBlocks} className="order-1 md:col-start-2 md:row-start-1" />
                <TodayBoard initialTasks={tasks} goals={goals} today={today} />
                <TodayHabits habits={habitItems} today={today} className="order-3 md:col-start-2 md:row-start-2" />
            </div>
        </main>
    )
}