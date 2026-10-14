import Link from "next/link"
import { auth } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import CompetitionDetail from "@/components/competitions/CompetitionDetail"
import { loadCompetition } from "@/lib/competitionData"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    // Someone else's competition looks the same as one that doesn't exist
    const today = await getUserToday()
    const competition = await loadCompetition((await params).id, session.user.id, today)
    if (!competition) notFound()

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <Link href="/dashboard/competitions" className="mb-6 inline-block text-sm text-ink-muted hover:text-ink">
                &larr; Competitions
            </Link>
            <CompetitionDetail competition={competition} today={today} />
        </main>
    )
}
