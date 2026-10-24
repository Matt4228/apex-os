import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TaskList from "@/components/tasks/TaskList"
import { countTaskStatuses, sortTasksByPriority } from "@/lib/dashboardStats"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"

export default async function TasksPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const userId = session.user.id
    const [allTasks, goals, today] = await Promise.all([
        prisma.task.findMany({
            where: { userId },
            include: { goal: { select: { id: true, title: true } } },
        }),
        // Offered in the goal picker
        prisma.goal.findMany({
            where: { userId, status: "active" },
            select: { id: true, title: true },
            orderBy: { createdAt: "desc" },
        }),
        getUserToday(),
    ])

    const tasks = sortTasksByPriority(allTasks)
    const { todoCount, doneCount } = countTaskStatuses(tasks)

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">Tasks</h2>
                <p className="text-ink-muted text-sm mt-1">
                    {todoCount} remaining · {doneCount} completed
                </p>
            </div>
            <TaskList initialTasks={tasks} goals={goals} today={today} />
        </main>
    )
}