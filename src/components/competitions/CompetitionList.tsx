"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Trophy, X } from "lucide-react"
import { deleteCompetition } from "@/app/actions/competitions"
import { EmptyState, type EmptyCopy } from "@/components/ui/empty-state"
import { UndoToast } from "@/components/ui/undo-toast"
import { catProps } from "@/lib/categoryColor"
import { lastDay } from "@/lib/competition"
import type { CompetitionView } from "@/lib/competitionData"
import { formatDateOnly } from "@/lib/dates"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import PlaceMedal from "./PlaceMedal"
import SeasonPips from "./SeasonPips"

const NO_COMPETITIONS: EmptyCopy = {
    icon: Trophy,
    title: "No competitions yet",
    description: "A competition runs for a set number of weeks, with a target for each week. Log your progress and count the weeks you complete.",
    action: "Create your first competition",
}

/** "Week 4 of 8", "Starts Oct 18" or "Finished Oct 24" */
function when(c: CompetitionView) {
    if (c.position.state === "active") return `Week ${c.position.week} of ${c.weeks}`
    if (c.position.state === "upcoming") return `Starts ${formatDateOnly(c.startDate, "MMM d")}`
    return `Finished ${formatDateOnly(lastDay(c), "MMM d")}`
}

/** Your competitions: running, coming up, and finished */
export default function CompetitionList({ competitions }: { competitions: CompetitionView[] }) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const { pending, undo, requestDelete, isHidden } = useUndoableDelete("competition", deleteCompetition, setError)
    const visible = competitions.filter(c => !isHidden(c.id))

    const groups = [
        { id: "running", title: "Running", items: visible.filter(c => c.position.state === "active") },
        { id: "upcoming", title: "Coming up", items: visible.filter(c => c.position.state === "upcoming") },
        { id: "finished", title: "Finished", items: visible.filter(c => c.position.state === "finished") },
    ].filter(g => g.items.length > 0)

    return (
        <div className="space-y-8">
            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}

            {visible.length === 0 ? (
                <EmptyState {...NO_COMPETITIONS} onAction={() => router.push("/dashboard/competitions/new")} />
            ) : (
                groups.map(group => (
                    // A fixed id: aria-labelledby reads a space as two ids, so "Coming up" can't be one
                    <section key={group.id} aria-labelledby={`group-${group.id}`}>
                        <h3 id={`group-${group.id}`} className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
                            {group.title}
                        </h3>
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {group.items.map(c => (
                                <li
                                    key={c.id}
                                    {...catProps(c.category)}
                                    className="relative rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-cat-solid"
                                >
                                    <Link href={`/dashboard/competitions/${c.id}`} className="block space-y-3 pr-6">
                                        <span className="flex items-start justify-between gap-3">
                                            {/* A finished competition leads with how you did */}
                                            <span className="flex min-w-0 items-center gap-3">
                                                {c.place !== undefined && <PlaceMedal place={c.place} />}
                                                <span className="min-w-0">
                                                    <span className="block font-semibold text-ink">{c.title}</span>
                                                    <span className="block text-xs text-ink-muted">
                                                        {when(c)} &middot; {c.metrics.map(m => m.name).join(", ")}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="text-right">
                                                <span className="block text-2xl font-extrabold leading-none tracking-tight tabular-nums text-ink">
                                                    {c.season.completedWeeks}
                                                    <span className="text-sm font-semibold text-ink-muted">/{c.weeks}</span>
                                                </span>
                                                <span className="text-[11px] text-ink-muted">complete</span>
                                            </span>
                                        </span>
                                        <SeasonPips weeks={c.season.weeks} label={`${c.title} weeks`} />
                                        <span className="sr-only">{c.season.completedWeeks} of {c.weeks} weeks complete</span>
                                    </Link>
                                    {c.isOwner && (
                                        <button
                                            onClick={() => {
                                                setError(null)
                                                requestDelete(c.id, c.title)
                                            }}
                                            aria-label={`Delete ${c.title}`}
                                            className="absolute right-2 top-2 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-sunken hover:text-danger-ink"
                                        >
                                            <X size={14} aria-hidden="true" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                ))
            )}

            {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
        </div>
    )
}
