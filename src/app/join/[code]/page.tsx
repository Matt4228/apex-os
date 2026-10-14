import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import JoinButton from "@/components/competitions/JoinButton"
import { joiningNote } from "@/components/competitions/joining"
import { Wordmark } from "@/components/layout/Wordmark"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { lastDay, weekOf } from "@/lib/competition"
import { formatDateOnly } from "@/lib/dates"
import { looksLikeJoinCode } from "@/lib/joinCode"
import { displayName } from "@/lib/people"
import { prisma } from "@/lib/prisma"
import { getUserToday } from "@/lib/user-today"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Join a competition" }

/**
 * An invite link. Anyone with it sees what they'd be joining; signed in, they can join; signed out, they sign in or
 * create an account and come back here
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params
    if (!looksLikeJoinCode(code)) notFound()

    const competition = await prisma.competition.findUnique({
        where: { joinCode: code },
        include: {
            owner: { select: { name: true, email: true } },
            metrics: { orderBy: { sortOrder: "asc" }, select: { name: true } },
            _count: { select: { participants: true } },
        },
    })
    if (!competition) notFound()

    const session = await auth()
    const userId = session?.user?.id
    const inIt = userId ? await prisma.participant.findFirst({ where: { competitionId: competition.id, userId } }) : null
    const position = weekOf(competition, await getUserToday())
    const weeksPassed = position.state === "active" ? position.week - 1 : 0
    const people = competition._count.participants

    return (
        <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
            <div className="w-full max-w-md space-y-6">
                <Link href="/" className="inline-block"><Wordmark /></Link>
                <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-ink-muted">
                            {displayName(competition.owner.name, competition.owner.email)} invites you to
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{competition.title}</h1>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <dt className="text-ink-muted">Runs</dt>
                            <dd className="text-ink">{competition.weeks} {competition.weeks === 1 ? "week" : "weeks"}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-muted">Dates</dt>
                            <dd className="text-ink">
                                {formatDateOnly(competition.startDate, "MMM d")} to {formatDateOnly(lastDay(competition), "MMM d, yyyy")}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-ink-muted">Measures</dt>
                            <dd className="text-ink">{competition.metrics.map(m => m.name).join(", ")}</dd>
                        </div>
                        <div>
                            <dt className="text-ink-muted">Competing</dt>
                            <dd className="text-ink">{people} {people === 1 ? "person" : "people"}</dd>
                        </div>
                    </dl>

                    {position.state === "finished" ? (
                        <p className="text-sm text-ink-soft">This competition has finished, so it can&apos;t be joined.</p>
                    ) : inIt ? (
                        <Button asChild className="w-full">
                            <Link href={`/dashboard/competitions/${competition.id}`}>You&apos;re in. Open it</Link>
                        </Button>
                    ) : (
                        <>
                            <p className="text-sm text-ink-muted">
                                {joiningNote({
                                    weeks: competition.weeks,
                                    weeksPassed,
                                    weeksLeft: competition.weeks - weeksPassed,
                                    upcoming: position.state === "upcoming",
                                })}
                            </p>
                            {userId ? (
                                <JoinButton code={code} title={competition.title} />
                            ) : (
                                <Button asChild className="w-full">
                                    <Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}>Sign in to join</Link>
                                </Button>
                            )}
                        </>
                    )}
                </section>
            </div>
        </main>
    )
}
