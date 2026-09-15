import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import GoalList from "@/components/goals/GoalList"
import { countGoalStatuses } from "@/lib/dashboardStats"

export const dynamic = "force-dynamic"

export default async function GoalsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    
    const goals = await prisma.goal.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            entries: {
                orderBy: { loggedOn: "asc" },
            },
        },
    })

    const {todoCount, doneCount} = countGoalStatuses(goals)

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900">Goals</h2>
                <p className="text-slate-500 text-sm mt-1">
                    {todoCount} active · {doneCount} completed
                </p>
            </div>

            <GoalList initialGoals={goals} />
        </main>
    )
}