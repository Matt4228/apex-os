import { auth } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import GoalDetail from "@/components/goals/GoalDetail"

export const dynamic = "force-dynamic"

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const { id } = await params
    // Scoped to the signed-in user, so someone else's goal looks exactly like a missing one
    const goal = await prisma.goal.findFirst({
        where: { id, userId: session.user.id },
        include: {
            entries: { orderBy: { loggedOn: "asc" } },
            tasks: true,
        },
    })
    if (!goal) notFound()

    return <GoalDetail initialGoal={goal} />
}