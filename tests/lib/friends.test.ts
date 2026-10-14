// tests/lib/friends.test.ts
import { loadFriends, pendingCounts } from "@/lib/friends"
import { displayName, initialsOf } from "@/lib/people"
import { describe, expect, it, vi } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

const user = (id: string, name: string | null) => ({ id, name, email: `${id}@example.com` })
const row = (id: string, requester: ReturnType<typeof user>, addressee: ReturnType<typeof user>, status: string) => ({
    id, requesterId: requester.id, addresseeId: addressee.id, status, createdAt: new Date(), requester, addressee,
})

describe("people", () => {
    it("makes initials from a name, or from the email when there's no name", () => {
        expect(initialsOf("Alex Rivera", "a@x.com")).toBe("AR")
        expect(initialsOf("sam", "s@x.com")).toBe("S")
        expect(initialsOf(null, "matt@example.com")).toBe("MA")
        expect(displayName(null, "matt@example.com")).toBe("matt")
        expect(displayName("  Sam Chen ", "s@x.com")).toBe("Sam Chen")
    })
})

describe("loadFriends", () => {
    const me = user("me", "Me")
    const alex = user("alex", "Alex Rivera")
    const sam = user("sam", "Sam Chen")
    const jo = user("jo", null)

    it("sorts people into friends, requests to answer, and requests sent, with competitions shared", async () => {
        prismaMock.friendship.findMany.mockResolvedValue([
            row("f1", me, sam, "accepted"),
            row("f2", alex, me, "accepted"),
            row("f3", jo, me, "pending"),
            row("f4", me, user("kim", "Kim Lee"), "pending"),
        ] as never)
        prismaMock.participant.findMany.mockResolvedValue([{ competitionId: "c1" }, { competitionId: "c2" }] as never)
        // groupBy's generic signature is too much for the mock's types; the shape is what matters here
        vi.mocked(prismaMock.participant.groupBy as unknown as () => Promise<unknown>).mockResolvedValue([{ userId: "alex", _count: { _all: 2 } }])

        const view = await loadFriends("me")

        expect(view.friends.map(f => `${f.name} ${f.sharedCompetitions}`)).toEqual(["Alex Rivera 2", "Sam Chen 0"])
        expect(view.received).toEqual([expect.objectContaining({ friendshipId: "f3", name: "jo", initials: "JO" })])
        expect(view.sent).toEqual([expect.objectContaining({ friendshipId: "f4", name: "Kim Lee", initials: "KL" })])
        expect(prismaMock.friendship.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: [{ requesterId: "me" }, { addresseeId: "me" }] } }))
    })

    it("skips counting shared competitions when there's nobody to count", async () => {
        prismaMock.friendship.findMany.mockResolvedValue([])
        prismaMock.participant.findMany.mockResolvedValue([])

        expect(await loadFriends("me")).toEqual({ friends: [], received: [], sent: [] })
        expect(prismaMock.participant.groupBy).not.toHaveBeenCalled()
    })
})

describe("pendingCounts", () => {
    it("counts friend requests and competition invites waiting for the user's answer", async () => {
        prismaMock.friendship.count.mockResolvedValue(2)
        prismaMock.competitionInvite.count.mockResolvedValue(1)

        expect(await pendingCounts("me")).toEqual({ friendRequests: 2, invites: 1 })
        expect(prismaMock.friendship.count).toHaveBeenCalledWith({ where: { addresseeId: "me", status: "pending" } })
        expect(prismaMock.competitionInvite.count).toHaveBeenCalledWith({ where: { inviteeId: "me", status: "pending" } })
    })
})
