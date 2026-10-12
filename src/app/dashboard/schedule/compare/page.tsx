import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ScheduleGrid from "@/components/schedule/ScheduleGrid"

export const dynamic = "force-dynamic"

// TEMPORARY: compares grid scales side by side. Delete this folder before merging
const SCALES = [1.5, 2, 2.5]

export default async function CompareScalesPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const blocks = await prisma.scheduleBlock.findMany({
        where: { userId: session.user.id },
        orderBy: [{ dayOfWeek: "asc" }, { sortOrder: "asc" }],
    })

    return (
        <main className="px-6 py-10">
            <h2 className="text-2xl font-semibold text-ink">Schedule scale</h2>
            <p className="text-ink-muted text-sm mt-1 mb-8">
                Today the grid is 1 px per minute. These are your real blocks: edits here are saved.
            </p>
            <div className="grid gap-8 xl:grid-cols-3">
                {SCALES.map(scale => (
                    <section key={scale} aria-label={`${scale} px per minute`}>
                        <h3 className="text-sm font-medium text-ink mb-1">{scale} px per minute</h3>
                        <p className="text-xs text-ink-muted mb-3">
                            An hour is {60 * scale}px, a 10 minute block {10 * scale}px
                        </p>
                        <ScheduleGrid initialBlocks={blocks} pxPerMinute={scale} />
                    </section>
                ))}
            </div>
        </main>
    )
}
