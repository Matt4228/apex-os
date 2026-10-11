"use client"

import { useState } from "react"
import { deleteCompetition, updateCompetitionStatus } from "@/app/actions/competitions"
import CompetitionCard from "./CompetitionCard"
import CreateCompetitionForm from "./CreateCompetitionForm"
import { restoreAt, succeeded } from "@/lib/optimistic"

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

export default function CompetitionList({
    initialCompetitions,
}: {
    initialCompetitions: Competition[]
}) {
    const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions)
    const [error, setError] = useState<string | null>(null)

    function handleCreate(competition: Competition) {
        setCompetitions(current => [competition, ...current])
    }

    async function handleDelete(id: string) {
        const index = competitions.findIndex(c => c.id === id)
        const competition = competitions[index]
        if (!competition) return
        setError(null)
        setCompetitions(current => current.filter(c => c.id !== id))

        if (!(await succeeded(deleteCompetition(id)))) {
            setCompetitions(current => restoreAt(current, competition, index))
            setError(`Couldn't delete "${competition.title}". Check your connection and try again.`)
        }
    }

    async function handleStatusChange(id: string, status: string) {
        const oldStatus = competitions.find(c => c.id === id)?.status
        if (!oldStatus) return
        setError(null)
        setCompetitions(current => current.map(c => c.id === id ? { ...c, status } : c))

        if (!(await succeeded(updateCompetitionStatus(id, status)))) {
            setCompetitions(current => current.map(c => c.id === id ? { ...c, status: oldStatus } : c))
            setError("Couldn't update that goal. Check your connection and try again.")
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

    const active = competitions.filter(c => c.status === "active")
    const complete = competitions.filter(c => c.status === "complete")

    return (
        <div>
            {error && <p role="alert" className="text-sm text-danger mb-3">{error}</p>}
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
                <CreateCompetitionForm onCreated={handleCreate} />
            </div>

            {complete.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
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
        </div>
    )
}