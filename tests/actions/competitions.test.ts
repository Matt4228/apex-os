// tests/actions/competitions.test.ts
import { logCompetitionEntry } from "@/app/actions/competitions"
import { beforeEach, describe, expect, it } from "vitest"
import { mockedAuth } from "../mocks/auth"
import { prismaMock } from "../mocks/prismaMock"

function formDataFrom(entries: Record<string, string>): FormData {
    const formData = new FormData()
    for (const [key, value] of Object.entries(entries)) {
        formData.set(key, value)
    }
    return formData
}

const ownedCompetition = {
    id: "comp-1",
    userId: "user-1",
    title: "Push-up challenge",
    rulesJson: null,
    startDate: new Date(),
    endDate: new Date(),
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
}

describe("logCompetitionEntry", () => {
    beforeEach(() => {
        mockedAuth.mockReset()
    })

    it("returns Unathorized when there is no session", async () => {
        mockedAuth.mockResolvedValue(null)

        const result = await logCompetitionEntry("comp-1", formDataFrom({ weekNumber: "1", value: "10", metric: "reps" }))

        expect(result).toEqual({ error: "Unauthorized" })
    })

    it("refuses to log against a competition owned by another user", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "attacker" } }  as never)
        prismaMock.competition.findFirst.mockResolvedValue(null)

        const result = await logCompetitionEntry("victim-comp", formDataFrom({ weekNumber: "1", value: "10", metric: "reps" }))

        expect(result).toEqual({ error: "Not found" })
        expect(prismaMock.competitionEntry.create).not.toHaveBeenCalled()
    })

    it("creates a new entry when no matching week/metric entry exists yet", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } }  as never)
        prismaMock.competition.findFirst.mockResolvedValue(ownedCompetition)
        prismaMock.competitionEntry.findFirst.mockResolvedValue(null)
        prismaMock.competitionEntry.create.mockResolvedValue({
            id: "entry-1",
            competitionId: "comp-1",
            weekNumber: 1,
            value: 10,
            metric: "reps",
            weekComplete: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const result = await logCompetitionEntry("comp-1", formDataFrom({ weekNumber: "1", value: "10", metric: "reps" }))

        expect(prismaMock.competitionEntry.create).toHaveBeenCalledWith({
            data: { competitionId: "comp-1", weekNumber: 1, value: 10, metric: "reps", weekComplete: false },
        })
        expect(result).toHaveProperty("entry")
        expect((result as { entry?: unknown }).entry).toBeDefined()
    })

    it("updates the existing entry when one already exists for that week/metric", async () => {
        mockedAuth.mockResolvedValue({ user: { id: "user-1" } }  as never)
        prismaMock.competition.findFirst.mockResolvedValue(ownedCompetition)
        prismaMock.competitionEntry.findFirst.mockResolvedValue({
            id: "entry-1",
            competitionId: "comp-1",
            weekNumber: 1,
            value: 8,
            metric: "reps",
            weekComplete: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        await logCompetitionEntry("comp-1", formDataFrom({ weekNumber: "1", value: "12", metric: "reps" }))

        expect(prismaMock.competitionEntry.update).toHaveBeenCalledWith({
            where: { id: "entry-1" },
            data: { competitionId: "comp-1", weekNumber: 1, value: 12, metric: "reps", weekComplete: false },
        })
        expect(prismaMock.competitionEntry.create).not.toHaveBeenCalled()
    })
})