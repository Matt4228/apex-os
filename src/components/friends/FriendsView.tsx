"use client"

import { useState } from "react"
import { cancelFriendRequest, removeFriend, respondToFriendRequest, sendFriendRequest } from "@/app/actions/friends"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FriendsView as View, Person } from "@/lib/friends"
import { failureMessage } from "@/lib/optimistic"

const card = "rounded-2xl border border-line bg-surface p-5 space-y-4"

/** One person in a list, with the buttons for what can be done about them */
function Row({ person, detail, children }: { person: Person; detail: string; children: React.ReactNode }) {
    return (
        <li className="flex items-center gap-3">
            <Avatar name={person.name} initials={person.initials} />
            <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{person.name}</span>
                <span className="block truncate text-xs text-ink-muted">{detail}</span>
            </span>
            <span className="flex flex-shrink-0 gap-1.5">{children}</span>
        </li>
    )
}

const together = (n: number) => (n === 0 ? "No competitions together yet" : `${n} ${n === 1 ? "competition" : "competitions"} together`)

/** Friends, requests waiting for an answer, requests sent, and adding someone by email */
export default function FriendsView({ initial }: { initial: View }) {
    const [view, setView] = useState(initial)
    const [email, setEmail] = useState("")
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    /** Takes a person out of one list (and into another) at once; puts them back if the server says no */
    async function change(update: (v: View) => View, save: Promise<unknown>, what: string) {
        setError(null)
        setMessage(null)
        const before = view
        setView(update)
        const problem = await failureMessage(save, what)
        if (problem) {
            setView(before)
            setError(problem)
        }
    }

    const without = (list: Person[], p: Person) => list.filter(x => x.friendshipId !== p.friendshipId)

    async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        setMessage(null)
        const result = await sendFriendRequest(email)
        if ("error" in result) {
            setError(result.error ?? "Something went wrong")
            return
        }
        setEmail("")
        setMessage(result.message)
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <div className="space-y-4">
                {view.received.length > 0 && (
                    <section aria-labelledby="requests" className={card}>
                        <h3 id="requests" className="text-[15px] font-semibold text-ink">
                            Requests <span className="font-normal text-ink-muted">{view.received.length}</span>
                        </h3>
                        <ul className="space-y-3">
                            {view.received.map(p => (
                                <Row key={p.friendshipId} person={p} detail="Wants to be friends">
                                    <Button
                                        size="sm"
                                        onClick={() => change(
                                            v => ({ ...v, received: without(v.received, p), friends: [...v.friends, p] }),
                                            respondToFriendRequest(p.friendshipId, true),
                                            "accept that request",
                                        )}
                                    >
                                        Accept
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => change(
                                            v => ({ ...v, received: without(v.received, p) }),
                                            respondToFriendRequest(p.friendshipId, false),
                                            "decline that request",
                                        )}
                                    >
                                        Decline
                                    </Button>
                                </Row>
                            ))}
                        </ul>
                    </section>
                )}

                <section aria-labelledby="friends" className={card}>
                    <h3 id="friends" className="text-[15px] font-semibold text-ink">
                        Friends <span className="font-normal text-ink-muted">{view.friends.length}</span>
                    </h3>
                    {view.friends.length === 0 ? (
                        <p className="text-sm text-ink-muted">No friends yet. Add someone by their email, then invite them to a competition.</p>
                    ) : (
                        <ul className="space-y-3">
                            {view.friends.map(p => (
                                <Row key={p.friendshipId} person={p} detail={together(p.sharedCompetitions)}>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        aria-label={`Remove ${p.name}`}
                                        onClick={() => change(v => ({ ...v, friends: without(v.friends, p) }), removeFriend(p.friendshipId), "remove that friend")}
                                    >
                                        Remove
                                    </Button>
                                </Row>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <div className="space-y-4">
                <section aria-labelledby="add" className={card}>
                    <h3 id="add" className="text-[15px] font-semibold text-ink">Add a friend</h3>
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <label className="min-w-0 flex-1">
                            <span className="sr-only">Their email</span>
                            <Input type="email" placeholder="Their email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </label>
                        <Button type="submit">Send request</Button>
                    </form>
                    {message && <p role="status" className="text-sm text-ink-soft">{message}</p>}
                    {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}
                </section>

                {view.sent.length > 0 && (
                    <section aria-labelledby="sent" className={card}>
                        <h3 id="sent" className="text-[15px] font-semibold text-ink">Sent</h3>
                        <ul className="space-y-3">
                            {view.sent.map(p => (
                                <Row key={p.friendshipId} person={p} detail="Waiting for an answer">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        aria-label={`Cancel request to ${p.name}`}
                                        onClick={() => change(v => ({ ...v, sent: without(v.sent, p) }), cancelFriendRequest(p.friendshipId), "cancel that request")}
                                    >
                                        Cancel
                                    </Button>
                                </Row>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    )
}
