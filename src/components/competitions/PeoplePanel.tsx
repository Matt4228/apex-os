"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { inviteFriends, leaveCompetition, removeParticipant, resetJoinCode } from "@/app/actions/competitions"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Invited, Member } from "@/lib/competitionData"
import type { Person } from "@/lib/friends"
import { failureMessage } from "@/lib/optimistic"

/**
 * Who's in a competition. The owner invites friends, shares the invite link (and can reset it) and removes members;
 * a member can leave. Once it has finished, nobody new can come in
 */
export default function PeoplePanel({
    competitionId,
    title,
    people: initialPeople,
    invited: initialInvited,
    joinCode: initialCode,
    isOwner,
    friends,
    finished,
    origin,
}: {
    competitionId: string
    title: string
    people: Member[]
    invited: Invited[]
    joinCode: string | null
    isOwner: boolean
    /** The owner's friends, to invite */
    friends: Person[]
    finished: boolean
    /** "https://apex-os.app": the site's address, for the invite link */
    origin: string
}) {
    const router = useRouter()
    const [people, setPeople] = useState(initialPeople)
    const [invited, setInvited] = useState(initialInvited)
    const [code, setCode] = useState(initialCode)
    const [picked, setPicked] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    // Removing someone or leaving deletes their logs, so each asks once more: the participant id, or "leave"
    const [confirming, setConfirming] = useState<string | null>(null)

    const taken = new Set([...people.map(p => p.userId), ...invited.map(i => i.userId)])
    const invitable = friends.filter(f => !taken.has(f.userId))
    const link = code ? `${origin}/join/${code}` : null

    async function run(action: Promise<unknown>, what: string) {
        setError(null)
        setNotice(null)
        const problem = await failureMessage(action, what)
        if (problem) setError(problem)
        return !problem
    }

    async function sendInvites() {
        const ok = await run(inviteFriends(competitionId, picked), "send those invites")
        if (!ok) return
        const sent = friends.filter(f => picked.includes(f.userId))
        setInvited(current => [...current, ...sent.map(f => ({ inviteId: `new-${f.userId}`, userId: f.userId, name: f.name, initials: f.initials }))])
        setPicked([])
        setNotice(`Invited ${sent.map(f => f.name).join(" and ")}.`)
    }

    async function remove(member: Member) {
        setConfirming(null)
        if (await run(removeParticipant(competitionId, member.participantId), `remove ${member.name}`)) {
            setPeople(current => current.filter(p => p.participantId !== member.participantId))
        }
    }

    async function leave() {
        if (await run(leaveCompetition(competitionId), "leave this competition")) router.push("/dashboard/competitions")
    }

    async function copy() {
        if (!link) return
        try {
            await navigator.clipboard.writeText(link)
            setNotice("Invite link copied.")
        } catch {
            setNotice("Select the link to copy it.")
        }
    }

    async function reset() {
        setError(null)
        const result = await resetJoinCode(competitionId)
        if ("error" in result) setError(`Couldn't make a new link. ${result.error}.`)
        else {
            setCode(result.joinCode)
            setNotice("New link made. The old one no longer works.")
        }
    }

    return (
        <div className="space-y-4">
            <ul className="space-y-2.5">
                {people.map(p => (
                    <li key={p.participantId} className="flex items-center gap-3">
                        <Avatar name={p.name} initials={p.initials} />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-ink">{p.isYou ? `${p.name} (you)` : p.name}</span>
                            <span className="block text-xs text-ink-muted">{p.role === "owner" ? "Set the targets" : "Competing"}</span>
                        </span>
                        {isOwner && p.role !== "owner" && (confirming === p.participantId ? (
                            <span className="flex items-center gap-1.5">
                                <span className="text-xs text-ink-muted">Their progress goes too.</span>
                                <Button size="sm" variant="danger" onClick={() => remove(p)}>Remove</Button>
                                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>Keep</Button>
                            </span>
                        ) : (
                            <Button size="sm" variant="ghost" aria-label={`Remove ${p.name}`} onClick={() => setConfirming(p.participantId)}>
                                Remove
                            </Button>
                        ))}
                    </li>
                ))}
                {invited.map(i => (
                    <li key={i.inviteId} className="flex items-center gap-3 opacity-70">
                        <Avatar name={i.name} initials={i.initials} />
                        <span className="min-w-0 flex-1 truncate text-ink-soft">{i.name}</span>
                        <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-muted">Invited</span>
                    </li>
                ))}
            </ul>

            {isOwner && !finished && (
                <div className="space-y-3 border-t border-line pt-4">
                    {invitable.length > 0 ? (
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold text-ink">Invite friends</legend>
                            {invitable.map(f => (
                                <label key={f.userId} className="flex items-center gap-2.5 text-sm text-ink-soft">
                                    <input
                                        type="checkbox"
                                        checked={picked.includes(f.userId)}
                                        onChange={e => setPicked(current => (e.target.checked ? [...current, f.userId] : current.filter(id => id !== f.userId)))}
                                    />
                                    <Avatar name={f.name} initials={f.initials} size="sm" />
                                    {f.name}
                                </label>
                            ))}
                            <Button size="sm" disabled={picked.length === 0} onClick={sendInvites}>
                                Send {picked.length > 1 ? `${picked.length} invites` : "invite"}
                            </Button>
                        </fieldset>
                    ) : (
                        <p className="text-sm text-ink-muted">Every friend is in or invited. Share the link with anyone else.</p>
                    )}

                    {link && (
                        <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-ink">Invite link</p>
                            <div className="flex items-center gap-2 rounded-lg bg-sunken px-3 py-2">
                                <input
                                    readOnly
                                    value={link}
                                    aria-label={`Invite link for ${title}`}
                                    onFocus={e => e.currentTarget.select()}
                                    className="min-w-0 flex-1 bg-transparent font-mono text-xs text-ink-soft outline-none"
                                />
                                <Button size="sm" variant="outline" onClick={copy}>Copy</Button>
                            </div>
                            <button onClick={reset} className="text-xs text-ink-muted hover:text-ink-soft">
                                Make a new link
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!isOwner && (confirming === "leave" ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink-soft">Leave? Your progress in it goes too.</span>
                    <Button size="sm" variant="danger" onClick={leave}>Leave</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>Stay</Button>
                </div>
            ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirming("leave")} className="text-danger-ink hover:text-danger-ink">
                    Leave competition
                </Button>
            ))}

            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
            {notice && <p role="status" className="text-sm text-ink-soft">{notice}</p>}
        </div>
    )
}
