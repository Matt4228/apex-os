import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import FriendsView from "@/components/friends/FriendsView"
import { loadFriends } from "@/lib/friends"

export const dynamic = "force-dynamic"

export default async function FriendsPage() {
    const session = await auth()
    if (!session?.user?.id) redirect("/login")

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <Link href="/dashboard/competitions" className="mb-6 inline-block text-sm text-ink-muted hover:text-ink">
                &larr; Competitions
            </Link>
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-ink">Friends</h2>
                <p className="text-ink-muted text-sm mt-1">The people you can invite to competitions.</p>
            </div>
            <FriendsView initial={await loadFriends(session.user.id)} />
        </main>
    )
}
