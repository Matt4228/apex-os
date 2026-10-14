// tests/actions/competitions.test.ts
import { createCompetition, deleteCompetition, deleteLog, logProgress, updateFutureTargets } from "@/app/actions/competitions"
import { parseDateOnly } from "@/lib/dates"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/user-today", () => ({ getUserToday: vi.fn(async () => "2026-10-11") }))

// The user's today is 2026-10-11, a Sunday. A competition that started Sunday Sep 20
// is in week 4 that day
const competition = (o: object = {}) => ({
    id: "run",
    ownerId: "user-1",
    title: "Run Club",
    category: "Fitness",
    startDate: parseDateOnly("2026-09-20"),
    weeks: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...o,
})

const participant = (o: object = {}) => ({ id: "p1", competitionId: "run", userId: "user-1", role: "owner", joinedAt: new Date(), competition: competition(), ...o })

function form(fields: Record<string, string>) {
    const formData = new FormData()
    for (const [key, value] of Object.entries(fields)) formData.set(key, value)
    return formData
}

const newCompetition = (o: Record<string, string> = {}) =>
    form({
        title: "Run Club",
        category: "Fitness",
        startDate: "2026-10-14",
        weeks: "2",
        metrics: JSON.stringify([{ name: "km run", unit: "km", targets: [15, 18] }]),
        ...o,
    })

beforeEach(() => {
    mockedAuth.mockReset()
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } } as never)
})

describe("createCompetition", () => {
    it("returns Unauthorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)
        expect(await createCompetition(newCompetition())).toEqual({ error: "Unauthorized" })
    })

    it("starts on the week's Sunday, with the creator as its owner and a target for every week", async () => {
        prismaMock.competition.create.mockResolvedValue(competition() as never)

        await createCompetition(newCompetition())

        expect(prismaMock.competition.create).toHaveBeenCalledWith({
            data: {
                ownerId: "user-1",
                title: "Run Club",
                category: "Fitness",
                startDate: parseDateOnly("2026-10-11"),
                weeks: 2,
                participants: { create: { userId: "user-1", role: "owner" } },
                metrics: {
                    create: [{ name: "km run", unit: "km", sortOrder: 0, targets: { create: [{ week: 1, target: 15 }, { week: 2, target: 18 }] } }],
                },
            },
        })
    })

    it.each([
        [{ title: " " }, "Give the competition a name"],
        [{ weeks: "0" }, "It runs at least 1 week"],
        [{ weeks: "157" }, "It runs at most 156 weeks (3 years)"],
        [{ metrics: "[]" }, "Add at least one metric"],
        [{ metrics: JSON.stringify(Array(4).fill({ name: "x", targets: [1, 1] })) }, "Up to 3 metrics"],
        [{ metrics: JSON.stringify([{ name: "km", targets: [15] }]) }, "Every metric needs a target for each week"],
        [{ metrics: JSON.stringify([{ name: "km", targets: [15, 0] }]) }, "Every target has to be above 0"],
        [{ metrics: "not json" }, "Invalid input: expected array, received null"],
    ])("rejects %o", async (overrides, message) => {
        expect(await createCompetition(newCompetition(overrides))).toEqual({ error: message })
        expect(prismaMock.competition.create).not.toHaveBeenCalled()
    })
})

it("accepts a three-year competition, the longest there can be", async () => {
    prismaMock.competition.create.mockResolvedValue(competition() as never)
    const targets = Array(156).fill(10)

    await createCompetition(newCompetition({ weeks: "156", metrics: JSON.stringify([{ name: "km run", targets }]) }))

    expect(prismaMock.competition.create).toHaveBeenCalledWith({ data: expect.objectContaining({ weeks: 156 }) })
})

describe("logProgress", () => {
    const entry = (o: Record<string, string> = {}) => form({ metricId: "km", amount: "5.5", note: "Easy run", ...o })

    it("logs into the current week, for the caller's own place in the competition", async () => {
        prismaMock.participant.findFirst.mockResolvedValue(participant() as never)
        prismaMock.competitionMetric.findFirst.mockResolvedValue({ id: "km" } as never)
        prismaMock.progressLog.create.mockResolvedValue({ id: "log-1" } as never)

        await logProgress("run", entry())

        expect(prismaMock.participant.findFirst).toHaveBeenCalledWith({ where: { competitionId: "run", userId: "user-1" }, include: { competition: true } })
        expect(prismaMock.progressLog.create).toHaveBeenCalledWith({
            data: { participantId: "p1", metricId: "km", week: 4, amount: 5.5, note: "Easy run" },
        })
    })

    it("refuses someone else's competition", async () => {
        prismaMock.participant.findFirst.mockResolvedValue(null)
        expect(await logProgress("theirs", entry())).toEqual({ error: "Not found" })
        expect(prismaMock.progressLog.create).not.toHaveBeenCalled()
    })

    it("refuses a metric from another competition", async () => {
        prismaMock.participant.findFirst.mockResolvedValue(participant() as never)
        prismaMock.competitionMetric.findFirst.mockResolvedValue(null)

        expect(await logProgress("run", entry({ metricId: "other" }))).toEqual({ error: "Not found" })
        expect(prismaMock.competitionMetric.findFirst).toHaveBeenCalledWith({ where: { id: "other", competitionId: "run" } })
    })

    it("refuses before the start and after the end", async () => {
        prismaMock.participant.findFirst.mockResolvedValue(participant({ competition: competition({ startDate: parseDateOnly("2026-10-18") }) }) as never)
        expect(await logProgress("run", entry())).toEqual({ error: "This competition hasn't started yet" })

        prismaMock.participant.findFirst.mockResolvedValue(participant({ competition: competition({ weeks: 2 }) }) as never)
        expect(await logProgress("run", entry())).toEqual({ error: "This competition has finished" })
        expect(prismaMock.progressLog.create).not.toHaveBeenCalled()
    })

    it("refuses an amount of 0 or less", async () => {
        expect(await logProgress("run", entry({ amount: "0" }))).toEqual({ error: "Log an amount above 0" })
    })
})

describe("deleteLog", () => {
    const log = (week: number) => ({ id: "log-1", week, participant: participant() })

    it("removes the caller's own log from this week", async () => {
        prismaMock.progressLog.findFirst.mockResolvedValue(log(4) as never)

        await deleteLog("log-1")

        expect(prismaMock.progressLog.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "log-1", participant: { userId: "user-1" } } }))
        expect(prismaMock.progressLog.delete).toHaveBeenCalledWith({ where: { id: "log-1" } })
    })

    it("leaves finished weeks alone", async () => {
        prismaMock.progressLog.findFirst.mockResolvedValue(log(3) as never)

        expect(await deleteLog("log-1")).toEqual({ error: "Only this week's logs can be removed" })
        expect(prismaMock.progressLog.delete).not.toHaveBeenCalled()
    })

    it("refuses someone else's log", async () => {
        prismaMock.progressLog.findFirst.mockResolvedValue(null)
        expect(await deleteLog("theirs")).toEqual({ error: "Not found" })
    })
})

describe("updateFutureTargets", () => {
    const owned = (o: object = {}) => ({ ...competition(o), metrics: [{ id: "km" }] })

    it("changes weeks after this one, owner only", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(owned() as never)

        await updateFutureTargets("run", [{ metricId: "km", week: 5, target: 25 }])

        expect(prismaMock.competition.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "run", ownerId: "user-1" } }))
        expect(prismaMock.weekTarget.upsert).toHaveBeenCalledWith({
            where: { metricId_week: { metricId: "km", week: 5 } },
            create: { metricId: "km", week: 5, target: 25 },
            update: { target: 25 },
        })
    })

    it("keeps this week and earlier fixed", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(owned() as never)

        expect(await updateFutureTargets("run", [{ metricId: "km", week: 4, target: 30 }])).toEqual({ error: "Only weeks that haven't started can change" })
        expect(prismaMock.weekTarget.upsert).not.toHaveBeenCalled()
    })

    it("lets every week change before the start", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(owned({ startDate: parseDateOnly("2026-10-18") }) as never)

        await updateFutureTargets("run", [{ metricId: "km", week: 1, target: 12 }])

        expect(prismaMock.weekTarget.upsert).toHaveBeenCalled()
    })

    it("refuses a member, another competition's metric, or a target of 0", async () => {
        prismaMock.competition.findFirst.mockResolvedValue(null)
        expect(await updateFutureTargets("run", [{ metricId: "km", week: 5, target: 25 }])).toEqual({ error: "Not found" })

        prismaMock.competition.findFirst.mockResolvedValue(owned() as never)
        expect(await updateFutureTargets("run", [{ metricId: "other", week: 5, target: 25 }])).toEqual({ error: "Not found" })
        expect(await updateFutureTargets("run", [{ metricId: "km", week: 5, target: 0 }])).toEqual({ error: "Every target has to be above 0" })
        expect(prismaMock.weekTarget.upsert).not.toHaveBeenCalled()
    })
})

describe("deleteCompetition", () => {
    it("deletes only the caller's own competition", async () => {
        await deleteCompetition("run")
        expect(prismaMock.competition.delete).toHaveBeenCalledWith({ where: { id: "run", ownerId: "user-1" } })
    })
})
