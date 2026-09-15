import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TaskList from "@/components/tasks/TaskList"
import { countTaskStatuses } from "@/lib/dashboardStats"

export const dynamic = "force-dynamic"

export default async function TasksPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const tasks = await prisma.task.findMany({
        where: { userId: session.user.id },
        orderBy: [
            { priority: "desc"},
            { createdAt: "desc" },
        ],
    })

    const {todoCount, doneCount} = countTaskStatuses(tasks)

    return (
        <main className="max-w-2xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900">Tasks</h2>
                <p className="text-slate-500 text-sm mt-1">
                    {todoCount} remaining · {doneCount} completed
                </p>
            </div>
            <TaskList initialTasks={tasks} />
        </main>
    )
}