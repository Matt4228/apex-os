"use client"

import { useState } from "react"
import { deleteCompetition, updateCompetitionStatus } from "@/app/actions/competitions"
import CompetitionCard from "./CompetitionCard"
import CreateCompetitionForm from "./CreateCompetitionForm"
import { failureMessage } from "@/lib/optimistic"
import { useUndoableDelete } from "@/lib/use-undoable-delete"
import { UndoToast } from "@/components/ui/undo-toast"
import type { EmptyCopy } from "@/components/ui/empty-state"
import { Trophy } from "lucide-react"

type Entry = {
    id: string
    weekNumber: number
    value: number
    metric: string
    weekComplete: boolean
}

type Competition = {
    id: string
    title: string
    status: string
    startDate: Date
    endDate: Date
    rulesJson: string | null
    entries: Entry[]
}

const NO_COMPETITIONS: EmptyCopy = {
    icon: Trophy,
    title: "No competitions yet",
    description: "A competition is a challenge with weekly targets over a set number of weeks. Log each week and count the weeks you win.",
    action: "Create your first competition",
}

export default function CompetitionList({
    initialCompetitions,
}: {
    initialCompetitions: Competition[]
}) {
    const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions)
    const [error, setError] = useState<string | null>(null)
    const { pending, undo, requestDelete, isHidden } = useUndoableDelete("competition", deleteCompetition, setError)

    function handleCreate(competition: Competition) {
        setCompetitions(current => [competition, ...current])
    }

    function handleDelete(id: string) {
      const competition = competitions.find(c => c.id === id)
      if (!competition) return
      setError(null)
      requestDelete(id, competition.title)
    }

    async function handleStatusChange(id: string, status: string) {
        const oldStatus = competitions.find(c => c.id === id)?.status
        if (!oldStatus) return
        setError(null)
        setCompetitions(current => current.map(c => c.id === id ? { ...c, status } : c))

        const problem = await failureMessage(updateCompetitionStatus(id, status), "update that competition")
        if (problem) {
            setCompetitions(current => current.map(c => c.id === id ? { ...c, status: oldStatus } : c))
            setError(problem)
        }
    }

    function handleEntryLogged(competitionId: string, entry: Entry) {
        setCompetitions(current =>
            current.map(c => 
                c.id === competitionId
                    ? {
                        ...c,
                        entries: [
                            entry,
                            ...c.entries.filter(e =>
                                !(e.weekNumber === entry.weekNumber && e.metric === entry.metric)
                            ),
                        ],
                    }
                : c
            )
        )
    }


    const visibleCompetitions = competitions.filter(c => !isHidden(c.id))
    const active = visibleCompetitions.filter(c => c.status === "active")
    const complete = visibleCompetitions.filter(c => c.status === "complete")

    return (
        <div>
            {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}
            <div className="space-y-4 mb-6">
                {active.map(competition => (
                    <CompetitionCard 
                        key={competition.id}
                        competition={competition}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onEntryLogged={handleEntryLogged}
                    />
                ))}
                <CreateCompetitionForm
                    onCreated={handleCreate}
                    empty={visibleCompetitions.length === 0 ? NO_COMPETITIONS : undefined}
                />
            </div>

            {complete.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
                        Completed
                    </p>
                    <div className="space-y-4">
                        {complete.map(competition => (
                            <CompetitionCard 
                                key={competition.id}
                                competition={competition}
                                onDelete={handleDelete}
                                onStatusChange={handleStatusChange}
                                onEntryLogged={handleEntryLogged}
                            />
                        ))}
                    </div>
                </div>
            )}
            {pending && <UndoToast message={`Deleted "${pending.label}"`} onUndo={undo} />}
        </div>
    )
}