// tests/lib/joining.test.ts
import { joiningNote } from "@/components/competitions/joining"
import { loadCompetition, loadInvites } from "@/lib/competitionData"
import { parseDateOnly } from "@/lib/dates"
import { JOIN_CODE_ALPHABET, looksLikeJoinCode, newJoinCode } from "@/lib/joinCode"
import { afterSignIn, routeFor } from "@/lib/routes"
import { describe, expect, it, vi } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

describe("join codes", () => {
    it("are 10 characters with no look-alikes, and differ each time", () => {
        expect(JOIN_CODE_ALPHABET).not.toMatch(/[01OIL]/)
        const codes = Array.from({ length: 200 }, newJoinCode)
        expect(codes.every(looksLikeJoinCode)).toBe(true)
        expect(new Set(codes).size).toBe(200)
    })
})

describe("invite links and signing in", () => {
    it("opens /join/ to everyone, signed in or not", () => {
        expect(routeFor("/join/ABCDEFGHJK", false)).toBe("next")
        expect(routeFor("/join/ABCDEFGHJK", true)).toBe("next")
    })

    it("only sends someone back to an invite link on this site after signing in", () => {
        expect(afterSignIn("/join/ABCDEFGHJK")).toBe("/join/ABCDEFGHJK")
        for (const next of [undefined, null, "", "https://evil.example", "//evil.example", "/join/../dashboard", "/dashboard/settings", "/join/AB?x=1"]) {
            expect(afterSignIn(next)).toBe("/dashboard")
        }
    })
})

describe("joiningNote", () => {
    it("says what joining now means", () => {
        expect(joiningNote({ weeks: 6, weeksPassed: 0, weeksLeft: 6, upcoming: true })).toBe("6 weeks, starting soon.")
        expect(joiningNote({ weeks: 6, weeksPassed: 0, weeksLeft: 6, upcoming: false })).toBe("It started this week. 6 weeks left.")
        expect(joiningNote({ weeks: 4, weeksPassed: 1, weeksLeft: 3, upcoming: false })).toBe("Week 1 has passed, so it counts as missed. 3 weeks left.")
        expect(joiningNote({ weeks: 4, weeksPassed: 3, weeksLeft: 1, upcoming: false })).toBe("Weeks 1 to 3 have passed, so they count as missed. 1 week left.")
    })
})

const user = (id: string, name: string) => ({ id, name, email: `${id}@x.com` })
const stored = (ownerId: string) => ({
    id: "run",
    ownerId,
    title: "Run Club",
    category: "Fitness",
    startDate: parseDateOnly("2026-10-04"),
    weeks: 4,
    joinCode: "ABCDEFGHJK",
    createdAt: new Date(),
    updatedAt: new Date(),
    metrics: [],
    participants: [
        { id: "p1", competitionId: "run", userId: "sam", role: "owner", joinedAt: new Date(), user: user("sam", "Sam Chen") },
        { id: "p2", competitionId: "run", userId: "me", role: "member", joinedAt: new Date(), user: user("me", "Me Too") },
    ],
    invites: [{ id: "i1", competitionId: "run", inviterId: "sam", inviteeId: "alex", status: "pending", createdAt: new Date(), invitee: user("alex", "Alex Rivera") }],
})

describe("loadCompetition people", () => {
    it("lists everyone in it, and keeps the invite link and pending invites for the owner", async () => {
        // The user's row in the competition, with the competition (and everyone in it) attached
        const row = (ownerId: string) => [{ id: "p2", competitionId: "run", userId: "me", role: "member", joinedAt: new Date(), logs: [], competition: stored(ownerId) }]
        prismaMock.participant.findMany.mockResolvedValue(row("sam") as never)
        vi.mocked(prismaMock.progressLog.groupBy as unknown as () => Promise<unknown>).mockResolvedValue([])
        prismaMock.progressLog.findMany.mockResolvedValue([] as never)

        const member = await loadCompetition("run", "me", "2026-10-14")
        expect(member?.people.map(p => `${p.name} ${p.role} ${p.isYou}`)).toEqual(["Sam Chen owner false", "Me Too member true"])
        expect(member?.joinCode).toBeNull()
        expect(member?.invited).toEqual([])

        prismaMock.participant.findMany.mockResolvedValue(row("me") as never)
        const owner = await loadCompetition("run", "me", "2026-10-14")
        expect(owner?.joinCode).toBe("ABCDEFGHJK")
        expect(owner?.invited).toEqual([{ inviteId: "i1", userId: "alex", name: "Alex Rivera", initials: "AR" }])
    })
})

describe("loadInvites", () => {
    const invite = (startDate: string, weeks: number) => ({
        id: `i-${startDate}`,
        competitionId: "c",
        inviterId: "sam",
        inviteeId: "me",
        status: "pending",
        createdAt: new Date(),
        competition: { ...stored("sam"), startDate: parseDateOnly(startDate), weeks },
        inviter: user("sam", "Sam Chen"),
    })

    it("shows running and upcoming invites with the weeks already missed, and drops finished ones", async () => {
        prismaMock.competitionInvite.findMany.mockResolvedValue([invite("2026-09-27", 4), invite("2026-10-18", 6), invite("2026-08-02", 2)] as never)

        const invites = await loadInvites("me", "2026-10-14")

        expect(invites.map(i => [i.weeksPassed, i.weeksLeft, i.upcoming])).toEqual([[2, 2, false], [0, 6, true]])
        expect(invites[0].inviter).toEqual({ name: "Sam Chen", initials: "SC" })
        expect(prismaMock.competitionInvite.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { inviteeId: "me", status: "pending" } }))
    })
})
