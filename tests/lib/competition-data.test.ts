// tests/lib/competition-data.test.ts
import { ACTIVITY_LIMIT, loadCompetition } from "@/lib/competitionData"
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
