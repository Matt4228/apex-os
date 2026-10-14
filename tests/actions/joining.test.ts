// tests/actions/joining.test.ts
import {
    inviteFriends,
    joinByCode,
    leaveCompetition,
    removeParticipant,
    resetJoinCode,
    respondToInvite,
} from "@/app/actions/competitions"
import { parseDateOnly } from "@/lib/dates"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/user-today", () => ({ getUserToday: vi.fn(async () => "2026-10-11") }))

// The user's today is Sunday 2026-10-11. This 8-week competition started Sep 20, so it's in week 4
const competition = (o: object = {}) => ({
    id: "run",
    ownerId: "me",
    title: "Run Club",
    category: "Fitness",
    startDate: parseDateOnly("2026-09-20"),
    weeks: 8,
    joinCode: "ABCDEFGHJK",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...o,
})
// Two weeks starting Sep 20: over by Oct 11
const over = { weeks: 2 }

beforeEach(() => {
    mockedAuth.mockReset()
    mockedAuth.mockResolvedValue({ user: { id: "me" } } as never)
    prismaMock.$transaction.mockResolvedValue([] as never)
})

describe("inviteFriends", () => {
    beforeEach(() => {
        prismaMock.competition.findFirst.mockResolvedValue(competition() as never)
        prismaMock.friendship.findMany.mockResolvedValue([
            { id: "f1", requesterId: "me", addresseeId: "alex", status: "accepted", createdAt: new Date() },
            { id: "f2", requesterId: "sam", addresseeId: "me", status: "accepted", createdAt: new Date() },
        ] as never)
        prismaMock.participant.findMany.mockResolvedValue([])
    })

    it("invites the owner's friends, and opens a declined invite again", async () => {
        expect(await inviteFriends("run", ["alex", "sam"])).toBeUndefined()

        expect(prismaMock.competition.findFirst).toHaveBeenCalledWith({ where: { id: "run", ownerId: "me" } })
        expect(prismaMock.competitionInvite.upsert).toHaveBeenCalledWith({
            where: { competitionId_inviteeId: { competitionId: "run", inviteeId: "alex" } },
            create: { competitionId: "run", inviterId: "me", inviteeId: "alex" },
            update: { status: "pending", inviterId: "me" },
        })
        expect(prismaMock.competitionInvite.upsert).toHaveBeenCalledTimes(2)
    })

    it("lets only the owner invite", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(null)
        expect(await inviteFriends("run", ["alex"])).toEqual({ error: "Not found" })
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it("invites only friends, and nobody already in", async () => {
        expect(await inviteFriends("run", ["alex", "stranger"])).toEqual({ error: "You can only invite friends" })

        prismaMock.participant.findMany.mockResolvedValue([{ userId: "alex" }] as never)
        expect(await inviteFriends("run", ["alex"])).toEqual({ error: "They're already in this competition" })
        expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it("refuses an empty list and a finished competition", async () => {
        expect(await inviteFriends("run", [])).toEqual({ error: "Pick someone to invite" })
        prismaMock.competition.findFirst.mockResolvedValue(competition(over) as never)
        expect(await inviteFriends("run", ["alex"])).toEqual({ error: "This competition has finished" })
    })
})

describe("respondToInvite", () => {
    const invite = (o: object = {}) => ({ id: "i1", competitionId: "run", inviterId: "sam", inviteeId: "me", status: "pending", createdAt: new Date(), competition: competition({ ownerId: "sam" }), ...o })

    it("lets only the person invited answer, while it's pending", async () => {
        prismaMock.competitionInvite.findFirst.mockResolvedValue(null)
        expect(await respondToInvite("i1", true)).toEqual({ error: "Not found" })
        expect(prismaMock.competitionInvite.findFirst).toHaveBeenCalledWith({
            where: { id: "i1", inviteeId: "me", status: "pending" },
            include: { competition: true },
        })
    })

    it("joins as a member and clears the invite", async () => {
        prismaMock.competitionInvite.findFirst.mockResolvedValue(invite() as never)

        expect(await respondToInvite("i1", true)).toEqual({ competitionId: "run" })
        expect(prismaMock.participant.create).toHaveBeenCalledWith({ data: { competitionId: "run", userId: "me", role: "member" } })
        expect(prismaMock.competitionInvite.delete).toHaveBeenCalledWith({ where: { id: "i1" } })
    })

    it("marks a declined invite, so the owner can ask again later", async () => {
        prismaMock.competitionInvite.findFirst.mockResolvedValue(invite() as never)

        expect(await respondToInvite("i1", false)).toEqual({ competitionId: null })
        expect(prismaMock.competitionInvite.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { status: "declined" } })
        expect(prismaMock.participant.create).not.toHaveBeenCalled()
    })

    it("can't accept once the competition has finished", async () => {
        prismaMock.competitionInvite.findFirst.mockResolvedValue(invite({ competition: competition(over) }) as never)
        expect(await respondToInvite("i1", true)).toEqual({ error: "This competition has finished" })
        expect(prismaMock.participant.create).not.toHaveBeenCalled()
    })
})

describe("joinByCode", () => {
    it("checks the code's shape before looking it up", async () => {
        for (const code of ["", "abcdefghjk", "ABCDEFGHJ0", "ABCDEFGHJKL", "../../etc"]) {
            expect(await joinByCode(code)).toEqual({ error: "Not found" })
        }
        expect(prismaMock.competition.findUnique).not.toHaveBeenCalled()
    })

    it("joins as a member and answers any invite to it", async () => {
        prismaMock.competition.findUnique.mockResolvedValue(competition({ ownerId: "sam" }) as never)
        prismaMock.participant.findFirst.mockResolvedValue(null)

        expect(await joinByCode("ABCDEFGHJK")).toEqual({ competitionId: "run" })
        expect(prismaMock.participant.create).toHaveBeenCalledWith({ data: { competitionId: "run", userId: "me", role: "member" } })
        expect(prismaMock.competitionInvite.deleteMany).toHaveBeenCalledWith({ where: { competitionId: "run", inviteeId: "me" } })
    })

    it("changes nothing for someone already in", async () => {
        prismaMock.competition.findUnique.mockResolvedValue(competition() as never)
        prismaMock.participant.findFirst.mockResolvedValue({ id: "p1" } as never)

        expect(await joinByCode("ABCDEFGHJK")).toEqual({ competitionId: "run" })
        expect(prismaMock.participant.create).not.toHaveBeenCalled()
    })

    it("refuses an unknown code and a finished competition", async () => {
        prismaMock.competition.findUnique.mockResolvedValue(null)
        expect(await joinByCode("ABCDEFGHJK")).toEqual({ error: "Not found" })

        prismaMock.competition.findUnique.mockResolvedValue(competition(over) as never)
        expect(await joinByCode("ABCDEFGHJK")).toEqual({ error: "This competition has finished" })
    })
})

describe("resetJoinCode", () => {
    it("gives the owner a new code, and nobody else", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(null)
        expect(await resetJoinCode("run")).toEqual({ error: "Not found" })

        prismaMock.competition.findFirst.mockResolvedValue(competition() as never)
        prismaMock.competition.update.mockImplementation((async (args: { data: { joinCode: string } }) => competition({ joinCode: args.data.joinCode })) as never)
        const result = await resetJoinCode("run")

        expect(result).toEqual({ joinCode: expect.stringMatching(/^[2-9A-HJKMNP-Z]{10}$/) })
        expect(result).not.toEqual({ joinCode: "ABCDEFGHJK" })
    })
})

describe("leaveCompetition", () => {
    it("lets a member leave, but not the owner", async () => {
        prismaMock.participant.findFirst.mockResolvedValue({ id: "p2", competitionId: "run", userId: "me", role: "member" } as never)
        expect(await leaveCompetition("run")).toBeUndefined()
        expect(prismaMock.participant.delete).toHaveBeenCalledWith({ where: { id: "p2" } })

        prismaMock.participant.findFirst.mockResolvedValue({ id: "p1", competitionId: "run", userId: "me", role: "owner" } as never)
        expect(await leaveCompetition("run")).toEqual({ error: "The owner can't leave. Delete the competition instead" })
    })
})

describe("removeParticipant", () => {
    it("lets the owner remove a member of this competition, never the owner", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(competition() as never)
        prismaMock.participant.findFirst.mockResolvedValue({ id: "p2" } as never)

        await removeParticipant("run", "p2")
        expect(prismaMock.participant.findFirst).toHaveBeenCalledWith({ where: { id: "p2", competitionId: "run", role: "member" } })
        expect(prismaMock.participant.delete).toHaveBeenCalledWith({ where: { id: "p2" } })
    })

    it("does nothing for someone who isn't the owner", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(null)
        expect(await removeParticipant("run", "p2")).toEqual({ error: "Not found" })
        expect(prismaMock.participant.delete).not.toHaveBeenCalled()
    })
})
