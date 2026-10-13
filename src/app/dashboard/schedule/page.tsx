import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ScheduleGrid from "@/components/schedule/ScheduleGrid"
import { uniqueCategories } from "@/lib/categoryColor"

export const dynamic = "force-dynamic"

export default async function SchedulePage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const userId = session.user.id
    const [blocks, goals, habits] = await Promise.all([
        prisma.scheduleBlock.findMany({
            where: { userId },
            orderBy: [{ dayOfWeek: "asc" }, { sortOrder: "asc" }],
        }),
        // Only the categories, so the block form can suggest the names already in use
        prisma.goal.findMany({ where: { userId }, select: { category: true } }),
        prisma.habit.findMany({ where: { userId }, select: { category: true } }),
    ])

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">Weekly Schedule</h2>
                <p className="text-ink-muted text-sm mt-1">
                    Build your ideal week. Drag to reorder blocks within each day.
                </p>
            </div>

            <ScheduleGrid initialBlocks={blocks} categories={uniqueCategories([...goals, ...habits].map(x => x.category))} />
        </main>
    )
}