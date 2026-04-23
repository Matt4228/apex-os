import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TaskList from "@/components/tasks/TaskList"

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

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-4">
                <h1 className="text-lg font-semibold text-slate-900">Apex OS</h1>
            </nav>

            <main className="max-w-2x1 mx-auto px-6 py-10">
                <div className="mb-8">
                    <h2 className="text-2x1 font-semibold text-slate-900">Tasks</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {tasks.filter(t => t.status === "todo").length} remaining · {tasks.filter(t => t.status === "done").length} completed
                    </p>
                </div>
                <TaskList initialTasks={tasks} />
            </main>
        </div>
    )
}