import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import CompetitionList from "@/components/competitions/CompetitionList"
import InviteCards from "@/components/competitions/InviteCards"
import { Button } from "@/components/ui/button"
import { loadCompetitions, loadInvites } from "@/lib/competitionData"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"

export default async function CompetitionPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    const today = await getUserToday()
    const [competitions, invites] = await Promise.all([loadCompetitions(session.user.id, today), loadInvites(session.user.id, today)])
    const running = competitions.filter(c => c.position.state === "active").length

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-semibold text-ink">Competitions</h2>
                    <p className="text-ink-muted text-sm mt-1">{running} running &middot; {competitions.length} in all</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/friends">Friends</Link>
                    </Button>
                    {competitions.length > 0 && (
                        <Button asChild size="sm">
                            <Link href="/dashboard/competitions/new">+ New competition</Link>
                        </Button>
                    )}
                </div>
            </div>

            <InviteCards invites={invites} />
            <CompetitionList competitions={competitions} />
        </main>
    )
}
