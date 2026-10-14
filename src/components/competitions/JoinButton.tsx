"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { joinByCode } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"

/** Joins with the link's code, then opens the competition */
export default function JoinButton({ code, title }: { code: string; title: string }) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [joining, setJoining] = useState(false)

    async function join() {
        setJoining(true)
        setError(null)
        const result = await joinByCode(code)
        if (!result || "error" in result) {
            setError(`Couldn't join. ${result?.error ?? "Something went wrong"}.`)
            setJoining(false)
            return
        }
        router.push(`/dashboard/competitions/${result.competitionId}`)
    }

    return (
        <div className="space-y-2">
            <Button onClick={join} disabled={joining} className="w-full">
                {joining ? "Joining..." : `Join ${title}`}
            </Button>
            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
        </div>
    )
}
