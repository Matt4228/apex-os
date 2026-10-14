"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { respondToInvite } from "@/app/actions/competitions"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { catProps } from "@/lib/categoryColor"
import type { InviteView } from "@/lib/competitionData"
import { joiningNote } from "./joining"

/** Invites waiting for an answer, at the top of Competitions */
export default function InviteCards({ invites: initial }: { invites: InviteView[] }) {
    const router = useRouter()
    const [invites, setInvites] = useState(initial)
    const [error, setError] = useState<string | null>(null)
    if (invites.length === 0) return null

    async function answer(invite: InviteView, accept: boolean) {
        setError(null)
        const result = await respondToInvite(invite.inviteId, accept)
        if (!result || "error" in result) {
            setError(`Couldn't answer that invite. ${result?.error ?? "Something went wrong"}.`)
            return
        }
        setInvites(current => current.filter(i => i.inviteId !== invite.inviteId))
        if (accept) router.push(`/dashboard/competitions/${invite.competitionId}`)
        else router.refresh()
    }

    return (
        <section aria-labelledby="invites" className="mb-8 space-y-3">
            <h3 id="invites" className="text-xs font-medium uppercase tracking-wide text-ink-muted">Invites</h3>
            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
            <ul className="grid gap-3 sm:grid-cols-2">
                {invites.map(invite => (
                    <li key={invite.inviteId} {...catProps(invite.category)} className="space-y-3 rounded-2xl border border-cat-line bg-surface p-4">
                        <div className="flex items-center gap-3">
                            <Avatar name={invite.inviter.name} initials={invite.inviter.initials} />
                            <p className="min-w-0 text-sm text-ink-soft">
                                <b className="font-semibold text-ink">{invite.inviter.name}</b> invited you to{" "}
                                <b className="font-semibold text-ink">{invite.title}</b>
                            </p>
                        </div>
                        <p className="text-sm text-ink-muted">{joiningNote(invite)}</p>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => answer(invite, true)} aria-label={`Accept ${invite.title}`}>Accept</Button>
                            <Button size="sm" variant="ghost" onClick={() => answer(invite, false)} aria-label={`Decline ${invite.title}`}>Decline</Button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}
