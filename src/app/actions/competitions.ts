"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const competitionSchema = z.object({
    title: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    rulesJson: z.string().optional(),
})

export async function createCompetition(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    const parsed = competitionSchema.safeParse({
        title: String(formData.get("title")),
        startDate: String(formData.get("startDate")),
        endDate: String(formData.get("endDate")),
        rulesJson: formData.get("rulesJson") ? String(formData.get("rulesJson")) : undefined,
    })

    if (!parsed.success) return { error: "Invalid input" }

    const competition = await prisma.competition.create({
        data: {
            userId: session.user!.id,
            title: parsed.data.title,
            startDate: new Date(parsed.data.startDate),
            endDate: new Date(parsed.data.endDate),
            rulesJson: parsed.data.rulesJson ||  null,
            status: "active",
        },
    })

    return { competition: { ...competition, entries: [] } }
}

export async function deleteCompetition(competitionId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    await prisma.competition.delete({
        where: { id: competitionId, userId: session.user.id },
    })
}

export async function logCompetitionEntry(competitionId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    const competition = await prisma.competition.findFirst({
        where: { id: competitionId, userId: session.user.id },
    })
    if (!competition) return { error: "Not found" }

    const weekNumber = formData.get("weekNumber")
    const value = formData.get("value")
    const metric = formData.get("metric")
    const weekComplete = formData.get("weekComplete") === "true"

    if (!weekNumber || !value || !metric) return { error: "Missing required fields" }

    const existing = await prisma.competitionEntry.findFirst({
        where: {
            competitionId,
            weekNumber: parseInt(String(weekNumber)),
            metric: String(metric),
        },
    })

    let entry
    if (existing) {
        entry = await prisma.competitionEntry.update({
            where: { id: existing.id },
            data: {
                competitionId,
                weekNumber: parseInt(String(weekNumber)),
                value: parseFloat(String(value)),
                metric: String(metric),
                weekComplete,
            },
        })
    }

    return { entry }
}

export async function updateCompetitionStatus(competitionId: string, status: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unathorized" }

    await prisma.competition.update({
        where: { id: competitionId, userId: session.user.id },
        data: { status },
    })
}