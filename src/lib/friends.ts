import { displayName, initialsOf } from "@/lib/people"
import { prisma } from "@/lib/prisma"

export type Person = {
    friendshipId: string
    userId: string
    name: string
    email: string
    initials: string
    /** Competitions you're both in */
    sharedCompetitions: number
}

export type FriendsView = { friends: Person[]; received: Person[]; sent: Person[] }

const person = { select: { id: true, name: true, email: true } }

/** The user's friends, the requests waiting for them, and the requests they've sent */
export async function loadFriends(userId: string): Promise<FriendsView> {
    const [rows, mine] = await Promise.all([
        prisma.friendship.findMany({
            where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
            include: { requester: person, addressee: person },
            orderBy: { createdAt: "desc" },
        }),
        prisma.participant.findMany({ where: { userId }, select: { competitionId: true } }),
    ])

    // How many of my competitions each other person is in, in one query
    const otherIds = rows.map(r => (r.requesterId === userId ? r.addresseeId : r.requesterId))
    const together = otherIds.length && mine.length
        ? await prisma.participant.groupBy({
              by: ["userId"],
              where: { userId: { in: otherIds }, competitionId: { in: mine.map(m => m.competitionId) } },
              _count: { _all: true },
          })
        : []
    const shared = new Map(together.map(t => [t.userId, t._count._all]))

    const view: FriendsView = { friends: [], received: [], sent: [] }
    for (const row of rows) {
        const other = row.requesterId === userId ? row.addressee : row.requester
        const entry: Person = {
            friendshipId: row.id,
            userId: other.id,
            name: displayName(other.name, other.email),
            email: other.email,
            initials: initialsOf(other.name, other.email),
            sharedCompetitions: shared.get(other.id) ?? 0,
        }
        if (row.status === "accepted") view.friends.push(entry)
        else if (row.addresseeId === userId) view.received.push(entry)
        else view.sent.push(entry)
    }
    view.friends.sort((a, b) => a.name.localeCompare(b.name))
    return view
}

/** What's waiting for the user's answer, for the sidebar count. Competition invites join this with part B's PR 2 */
export async function pendingCounts(userId: string): Promise<{ friendRequests: number; invites: number }> {
    const friendRequests = await prisma.friendship.count({ where: { addresseeId: userId, status: "pending" } })
    return { friendRequests, invites: 0 }
}
