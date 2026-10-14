import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import CompetitionForm from "@/components/competitions/CompetitionForm"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"

export default async function NewCompetitionPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">New competition</h2>
                <p className="text-ink-muted text-sm mt-1">Weeks run Sunday to Saturday. Set a target for every week; you can change weeks that haven&apos;t started.</p>
            </div>
            <CompetitionForm today={await getUserToday()} />
        </main>
    )
}
