import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ScheduleGrid from "@/components/schedule/ScheduleGrid"

export const dynamic = "force-dynamic"

export default async function SchedulePage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const blocks = await prisma.scheduleBlock.findMany({
        where: { userId: session.user.id },
        orderBy: [{ dayOfWeek: "asc" }, { sortOrder: "asc" }],
    })

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-6 py-4">
                <h1 className="text-lg font-semibold text-slate-900">Apex OS</h1>
            </nav>

            <main className="max-w-3x1 mx-auto px-6 py-10">
                <div className="mb-8">
                    <h2 className="text-2x1 font-semibold text-slate-900">Weekly Schedule</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Build your ideal week. Drag to reorder blocks within each day.
                    </p>
                </div>

                <ScheduleGrid initialBlocks={blocks} />
            </main>
        </div>
    )
}