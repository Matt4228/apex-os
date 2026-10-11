import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDateOnly, parseDateOnly, weekRangeOf } from "@/lib/dates"
import { getUserToday } from "@/lib/user-today"
import DashboardTaskList from "@/components/dashboard/DashboardTaskList"
import { countCompletedWeeks, sortTasksByPriority } from "@/lib/dashboardStats"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const userId = session.user.id
    const today = await getUserToday()
    const todayDate = parseDateOnly(today)
    const { start: weekStart, end: weekEnd } = weekRangeOf(today)
    const dayOfWeek = formatDateOnly(todayDate, "EEEE")

    const [todoTasks, goals, activeGoalCount, habits, competitions, scheduleBlocks] = await Promise.all([
        // All open tasks: sorted in code (see sortTasksByPriority), and count for the stat
        prisma.task.findMany({
            where: { userId, status: "todo" },
        }),
        prisma.goal.findMany({
            where: { userId, status: "active" },
            orderBy: { createdAt: "desc" },
            take: 4,
            include: {
                entries: {
                    orderBy: { loggedOn: "desc" },
                    take: 1,
                },
            },
        }),
        // The panel shows 4 goals, but the stat needs the real total
        prisma.goal.count({
            where: { userId, status: "active" },
        }),
        prisma.habit.findMany({
            where: { userId, isActive: true },
            include: {
                logs: {
                    where: {
                        completedOn: { gte: weekStart, lt: weekEnd },
                    },
                },
            },
        }),
        prisma.competition.findMany({
            where: { userId, status: "active" },
            include: {
                // Every entry is needed to count completed weeks; only two small fields
                entries: {
                    select: { weekNumber: true, weekComplete: true },
                },
            },
        }),
        prisma.scheduleBlock.findMany({
            where: { userId, dayOfWeek },
            // "HH:MM" text sorts in time order because hours arae zero padded
            orderBy: { startTime: "asc" },
        }),
    ])

    const todoCount = todoTasks.length
    const topTasks = sortTasksByPriority(todoTasks).slice(0, 5)
    const habitCompletionRate = habits.length > 0
        ?  Math.round(
            (habits.reduce((acc, h) => {
                const completed = h.logs.length
                const rate = Math.min(completed / h.targetPerWeek, 1)
                return acc + rate
            }, 0) / habits.length) * 100
        )
        : 0

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">
                    {formatDateOnly(todayDate, "EEEE, MMMM d")}
                </h2>
                <p className="text-ink-muted text-sm mt-1">
                    Welcome back, {session.user?.name?.split(" ")[0] ?? "there"}
                </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface border border-line rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Tasks remaining</p>
                    <p className="text-2xl font-semibold text-ink">{todoCount}</p>
                </div>
                <div className="bg-surface border border-line rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Active goals</p>
                    <p className="text-2xl font-semibold text-ink">{activeGoalCount}</p>
                </div>
                <div className="bg-surface border border-line rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Habit completion</p>
                    <p className="text-2xl font-semibold text-ink">{habitCompletionRate}%</p>
                </div>
                <div className="bg-surface border border-line rounded-lg p-4">
                    <p className="text-xs text-ink-muted mb-1">Active competitions</p>
                    <p className="text-2xl font-semibold text-ink">{competitions.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Today's schedule */}
                <div className="bg-surface border border-line rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-ink">Today&apos;s Schedule</h3>
                        <Link href="/dashboard/schedule" className="text-xs text-ink-muted hover:text-ink-soft">
                            Edit →
                        </Link>
                    </div>
                    {scheduleBlocks.length === 0 ? (
                        <p className="text-sm text-ink-muted">No blocks scheduled for today.</p>
                    ) : (
                        <div className="space-y-2">
                            {scheduleBlocks.map(block => (
                                <div key={block.id} className="flex items-center gap-3">
                                    <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: block.color ?? "#2E294E" }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-ink truncate">{block.label}</p>
                                    </div>
                                    <p className="text-xs text-ink-muted flex-shrink-0">
                                        {block.startTime}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* Tasks */}
                <div className="bg-surface border border-line rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-ink">Tasks</h3>
                        <Link href="/dashboard/tasks" className="text-xs text-ink-muted hover:text-ink-soft">
                        View all →
                        </Link>
                    </div>
                    <DashboardTaskList initialTasks={topTasks} />
                </div>

                {/* Habits */}
                <div className="bg-surface border border-line rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-ink">Habits this week</h3>
                        <Link href="/dashboard/habits" className="text-xs text-ink-muted hover:text-ink-soft">
                            View all →
                        </Link>
                    </div>
                    {habits.length === 0 ? (
                        <p className="text-sm text-ink-muted">No habits tracked yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {habits.map(habit => {
                                const completed = habit.logs.length
                                const pct = Math.min((completed / habit.targetPerWeek) * 100, 100)
                                return (
                                    <div key={habit.id}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-ink-soft font-medium truncate">{habit.title}</span>
                                            <span className="text-ink-muted flex-shrink-0 ml-2">{completed}/{habit.targetPerWeek}</span>
                                        </div>
                                        <div className="h-1.5 bg-sunken rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent rounded-full transition-all"
                                                style={{ width: `${pct}%`}}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Goals */}
                <div className="bg-surface border border-line rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-ink">Active goals</h3>
                        <Link href="/dashboard/goals" className="text-xs text-ink-muted hover:text-ink-soft">
                            View all →
                        </Link>
                    </div>
                    {goals.length === 0 ? (
                        <p className="text-sm text-ink-muted">No active goals.</p>
                    ) : (
                        <div className="space-y-3">
                            {goals.map(goal => {
                                const latest = goal.entries[0]
                                const pct = goal.targetValue && latest
                                    ? Math.min((latest.value / goal.targetValue) * 100, 100)
                                    : null
                                return (
                                    <div key={goal.id}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-ink-soft font-medium truncate">{goal.title}</span>
                                            {pct !== null && (
                                                <span className="text-ink-muted flex-shrink-0 ml-2">{Math.round(pct)}%</span>
                                            )}
                                        </div>
                                        {pct !== null && (
                                            <div className="h-1.5 bg-sunken rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-accent rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        )}
                                        {pct === null && (
                                            <p className="text-xs text-ink-muted">No progress logged yet</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Competitions */}
                {competitions.length > 0 && (
                    <div className="bg-surface border border-line rounded-lg p-5 md:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-ink">Active competitions</h3>
                            <Link href="/dashboard/competitions" className="text-xs text-ink-muted hover:text-ink-soft">
                                View all →
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {competitions.map(competition => {
                                const completedWeeks = countCompletedWeeks(competition.entries)
                                return (
                                    <div key={competition.id} className="border border-line rounded-lg p-3">
                                        <p className="text-sm font-medium text-ink mb-1">{competition.title}</p>
                                        <p className="text-xs text-ink-muted">{completedWeeks} weeks complete</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}