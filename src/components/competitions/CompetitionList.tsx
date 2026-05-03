"use client"

import { useState } from "react"
import { deleteCompetition, updateCompetitionStatus } from "@/app/actions/competitions"
import CompetitionCard from "./CompetitionCard"
import CreateCompetitionForm from "./CreateCompetitionForm"

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

    function handleCreate(competition: Competition) {
        setCompetitions(current => [competition, ...current])
    }

    function handleDelete(id: string) {
        setCompetitions(current => current.filter(c => c.id !== id))
        deleteCompetition(id)
    }

    function handleStatusChange(id: string, status: string){
        setCompetitions(current =>
            current.map(c => c.id === id ? { ...c, status } : c)
        )
        updateCompetitionStatus(id, status)
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
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
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