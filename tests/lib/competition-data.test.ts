// tests/lib/competition-data.test.ts
import { ACTIVITY_LIMIT, loadCompetition, loadCompetitions } from "@/lib/competitionData"
import { parseDateOnly } from "@/lib/dates"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { prismaMock } from "../mocks/prismaMock"

const user = (id: string, name: string) => ({ id, name, email: `${id}@x.com` })
const participant = (id: string, userId: string, name: string, role = "member") =>
    ({ id, competitionId: "run", userId, role, joinedAt: new Date(), user: user(userId, name) })
const stored = {
    id: "run",
    ownerId: "sam",
    title: "Run Club",
    category: "Fitness",
    startDate: parseDateOnly("2026-10-04"),
    weeks: 4,
    joinCode: "ABCDEFGHJK",
    createdAt: new Date(),
    updatedAt: new Date(),
    metrics: [],
    participants: [participant("p1", "me", "Me Too"), participant("p2", "sam", "Sam Chen", "owner"), participant("p3", "alex", "Alex Rivera")],
    invites: [],
}
// groupBy's generic signature is too much for the mock's types; the shape is what matters here
const groupBy = () => vi.mocked(prismaMock.progressLog.groupBy as unknown as () => Promise<unknown>)
// The viewer's row in the competition, with the competition (and everyone in it) attached
const row = { id: "p1", competitionId: "run", userId: "me", role: "member", joinedAt: new Date(), logs: [], competition: stored }

describe("loadCompetition competitors and activity", () => {
    beforeEach(() => {
        prismaMock.participant.findMany.mockResolvedValue([row] as never)
        groupBy().mockResolvedValue([])
        prismaMock.progressLog.findMany.mockResolvedValue([] as never)
    })

    it("sums every competitor's logs per goal and week", async () => {
        groupBy().mockResolvedValue([
            { participantId: "p1", metricId: "km", week: 2, _sum: { amount: 9 } },
            { participantId: "p2", metricId: "km", week: 2, _sum: { amount: 14 } },
        ])

        const view = await loadCompetition("run", "me", "2026-10-14")

        expect(view?.competitors.map(c => [c.name, c.isYou, c.totals])).toEqual([
            ["Me Too", true, [{ metricId: "km", week: 2, amount: 9 }]],
            ["Sam Chen", false, [{ metricId: "km", week: 2, amount: 14 }]],
            ["Alex Rivera", false, []],
        ])
    })

    it("shows a member everyone's latest logs, notes included, newest first", async () => {
        prismaMock.progressLog.findMany.mockResolvedValue([
            {
                id: "l1", participantId: "p2", metricId: "km", week: 2, amount: 6.2, note: "Legs were dead", createdAt: new Date("2026-10-13T19:00:00Z"),
                participant: participant("p2", "sam", "Sam Chen", "owner"),
            },
        ] as never)

        const view = await loadCompetition("run", "me", "2026-10-14")

        expect(prismaMock.progressLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { participant: { competitionId: "run" } },
            orderBy: { createdAt: "desc" },
            take: ACTIVITY_LIMIT,
        }))
        expect(view?.activity).toEqual([{
            id: "l1", participantId: "p2", name: "Sam Chen", initials: "SC", isYou: false,
            metricId: "km", week: 2, amount: 6.2, note: "Legs were dead", createdAt: new Date("2026-10-13T19:00:00Z"),
        }])
    })

    it("still shows nothing to someone not in the competition", async () => {
        prismaMock.participant.findMany.mockResolvedValue([] as never)

        expect(await loadCompetition("run", "stranger", "2026-10-14")).toBeNull()
        expect(prismaMock.progressLog.groupBy).not.toHaveBeenCalled()
        expect(prismaMock.progressLog.findMany).not.toHaveBeenCalled()
    })

    it("stamps when it was loaded", async () => {
        const view = await loadCompetition("run", "me", "2026-10-14")

        expect(new Date(view!.loadedAt).toISOString()).toBe(view!.loadedAt)
    })
})

describe("loadCompetitions places on finished competitions", () => {
    // Run Club, finished: 10 km a week for 4 weeks. You completed week 1
    const metric = { id: "km", competitionId: "run", name: "km run", unit: "km", sortOrder: 0, targets: [1, 2, 3, 4].map(week => ({ id: `t${week}`, metricId: "km", week, target: 10 })) }
    const finished = { ...stored, metrics: [metric] }
    const myLog = { id: "a", participantId: "p1", metricId: "km", week: 1, amount: 10, note: "Easy", createdAt: new Date("2026-10-05") }
    const mine = (competition: object) => ({ ...row, logs: [myLog], competition })
    const AFTER = "2026-11-10"

    beforeEach(() => {
        groupBy().mockResolvedValue([])
    })

    it("works out your final place from everyone's totals", async () => {
        prismaMock.participant.findMany.mockResolvedValue([mine(finished)] as never)
        groupBy().mockResolvedValue([
            { participantId: "p2", metricId: "km", week: 1, _sum: { amount: 10 } },
            { participantId: "p2", metricId: "km", week: 2, _sum: { amount: 10 } },
            { participantId: "p3", metricId: "km", week: 1, _sum: { amount: 5 } },
        ])

        const [view] = await loadCompetitions("me", AFTER)

        expect(view.place).toBe(2)
        expect(groupBy()).toHaveBeenCalledWith(expect.objectContaining({
            by: ["participantId", "metricId", "week"],
            where: { participant: { competitionId: { in: ["run"] } } },
        }))
    })

    it("shares a place on a tie", async () => {
        prismaMock.participant.findMany.mockResolvedValue([mine(finished)] as never)
        groupBy().mockResolvedValue([{ participantId: "p2", metricId: "km", week: 1, _sum: { amount: 10 } }])

        const [view] = await loadCompetitions("me", AFTER)

        expect(view.place).toBe(1)
    })

    it("marks a finished competition you did alone as solo, without summing anyone", async () => {
        prismaMock.participant.findMany.mockResolvedValue([mine({ ...finished, participants: [participant("p1", "me", "Me Too", "owner")] })] as never)

        const [view] = await loadCompetitions("me", AFTER)

        expect(view.place).toBe("solo")
        expect(prismaMock.progressLog.groupBy).not.toHaveBeenCalled()
    })

    it("gives running competitions no place and sums nothing", async () => {
        prismaMock.participant.findMany.mockResolvedValue([mine(finished)] as never)

        const [view] = await loadCompetitions("me", "2026-10-14")

        expect(view.place).toBeUndefined()
        expect(prismaMock.progressLog.groupBy).not.toHaveBeenCalled()
    })

    it("sends only the place, never anyone else's totals", async () => {
        prismaMock.participant.findMany.mockResolvedValue([mine(finished)] as never)
        groupBy().mockResolvedValue([{ participantId: "p2", metricId: "km", week: 1, _sum: { amount: 12 } }])

        const [view] = await loadCompetitions("me", AFTER)

        expect(view).not.toHaveProperty("competitors")
        expect(view.logs).toEqual([{ id: "a", metricId: "km", week: 1, amount: 10, note: "Easy", createdAt: new Date("2026-10-05") }])
        expect(JSON.stringify(view)).not.toContain("12")
    })
})
