import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { signOut } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { startOfWeek, endOfWeek, isToday, format } from "date-fns"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const userId = session.user.id
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 })
    const dayOfWeek = format(now, "EEEE")

    const [tasks, goals, habits, competitions, scheduleBlocks] = await Promise.all([
        prisma.task.findMany({
            where: { userId, status: "todo" },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
            take: 5,
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
        prisma.habit.findMany({
            where: { userId, isActive: true },
            include: {
                logs: {
                    where: {
                        completedOn: { gte: weekStart, lte: weekEnd },
                    },
                },
            },
        }),
        prisma.competition.findMany({
            where: { userId, status: "active" },
            include: {
                entries: {
                    orderBy: { weekNumber: "desc" },
                    take: 3,
                },
            },
        }),
        prisma.scheduleBlock.findMany({
            where: { userId, dayOfWeek },
            orderBy: { sortOrder: "asc" },
        }),
    ])

    const todoCount = tasks.length
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
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-slate-900">Apex OS</h1>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-1 text-sm text-slate-400">
                        <Link href="/dashboard/tasks" className="px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors">Tasks</Link>
                        <Link href="/dashboard/goals" className="px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors">Goals</Link>
                        <Link href="/dashboard/habits" className="px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors">Habits</Link>
                        <Link href="/dashboard/schedule" className="px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors">Schedule</Link>
                        <Link href="/dashboard/competitions" className="px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors">Competitions</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 hidden md:block">
                            {session.user?.name ?? session.user?.email}
                        </span>
                        <form
                            action={async () => {
                                "use server"
                                await signOut({ redirectTo: "/login"})
                            }}
                        >
                            <Button variant="outline" size="sm" type="submit">
                                Sign out
                            </Button>
                        </form>
                    </div>
                </div>
            </nav>

            <main className="max-w-5x1 mx-auto px-6 py-10">
                <div className="mb-8">
                    <h2 className="text-2x1 font-semibold text-slate-900">
                        {format(now, "EEEE, MMMM d")}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Welcome back, {session.user?.name?.split(" ")[0] ?? "there"}
                    </p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-400 mb-1">Tasks remaining</p>
                        <p className="text-2x1 font-semibold text-slate-900">{todoCount}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-400 mb-1">Active goals</p>
                        <p className="text-2x1 font-semibold text-slate-900">{goals.length}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-400 mb-1">Habit completion</p>
                        <p className="text-2x1 font-semibold text-slate-900">{habitCompletionRate}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <p className="text-xs text-slate-400 mb-1">Active competitions</p>
                        <p className="text-2x1 font-semibold text-slate-900">{competitions.length}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Today's schedule */}
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">Today's Schedule</h3>
                            <Link href="/dashboard/schedule" className="text-xs text-slate-400 hover:text-slate-700">
                                Edit →
                            </Link>
                        </div>
                        {scheduleBlocks.length === 0 ? (
                            <p className="text-sm text-slate-400">No blocks scheduled for today.</p>
                        ) : (
                            <div className="space-y-2">
                                {scheduleBlocks.map(block => (
                                    <div key={block.id} className="flex items-center gap-3">
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: block.color ?? "#1a1a2e" }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-900 truncate">{block.label}</p>
                                        </div>
                                        <p className="text-xs text-slate-400 flex-shrink-0">
                                            {block.startTime}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>


                    {/* Tasks */}
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">Tasks</h3>
                            <Link href="/dashboard/tasks" className="text-xs text-slate-400 hover:text-slate-700">
                                View all →
                            </Link>
                        </div>
                        {tasks.length === 0 ? (
                            <p className="text-sm text-slate-400">No tasks remaining. Nice work.</p>
                        ) : (
                            <div className="space-y-2">
                                {tasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                        <p className="text-sm text-slate-900 flex-1 truncate">{task.title}</p>
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                            task.priority === "high" ? "bg-red-100 text-red-700" :
                                            task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                                            "bg-green-100 text-green-700"
                                        }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Habits */}
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">Habits this week</h3>
                            <Link href="/dashboard/habits" className="text-xs text-slate-400 hover:text-slate-700">
                                View all →
                            </Link>
                        </div>
                        {habits.length === 0 ? (
                            <p className="text-sm text-slate-400">No habits tracked yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {habits.map(habit => {
                                    const completed = habit.logs.length
                                    const pct = Math.min((completed / habit.targetPerWeek) * 100, 100)
                                    return (
                                        <div key={habit.id}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-700 font-medium truncate">{habit.title}</span>
                                                <span className="text-slate-400 flex-shrink-0 ml-2">{completed}/{habit.targetPerWeek}</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-slate-900 rounded-full transition-all"
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
                    <div className="bg-white border border-slate-200 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-900">Active goals</h3>
                            <Link href="/dashboard/goals" className="text-xs text-slate-400 hover:text-slate-700">
                                View all →
                            </Link>
                        </div>
                        {goals.length === 0 ? (
                            <p className="text-sm text-slate-400">No active goals.</p>
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
                                                <span className="text-slate-700 font-medium truncate">{goal.title}</span>
                                                {pct !== null && (
                                                    <span className="text-slate-400 flex-shrink-0 ml-2">{Math.round(pct)}%</span>
                                                )}
                                            </div>
                                            {pct !== null && (
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-slate-900 rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            )}
                                            {pct === null && (
                                                <p className="text-xs text-slate-400">No progress logged yet</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Competitions */}
                    {competitions.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-lg p-5 md:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-slate-900">Active competitions</h3>
                                <Link href="/dashboard/competitions" className="text-xs text-slate-400 hover:text-slate-700">
                                    View all →
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {competitions.map(competition => {
                                    const completedWeeks = competition.entries.filter(e => e.weekComplete).length
                                    return (
                                        <div key={competition.id} className="border border-slate-100 rounded-lg p-3">
                                            <p className="text-sm font-medium text-slate-900 mb-1">{competition.title}</p>
                                            <p className="text-xs text-slate-400">{completedWeeks} weeks complete</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}