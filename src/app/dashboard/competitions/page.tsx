import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CompetitionList from "@/components/competitions/CompetitionList"

export const dynamic = "force-dynamic"

export default async function CompetitionPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")
    
    const competitions = await prisma.competition.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            entries: {
                orderBy: { weekNumber: "desc" },
            },
        },
    })

    return (
        <main className="max-w-2x1 mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2x1 font-semibold text-slate-900">Competitions</h2>
                <p className="text-slate-500 text-sm mt-1">
                    {competitions.filter(c => c.status === "active").length} active · {competitions.filter(c => c.status === "complete").length} completed
                </p>
            </div>

            <CompetitionList initialCompetitions={competitions} />
        </main>
    )
}