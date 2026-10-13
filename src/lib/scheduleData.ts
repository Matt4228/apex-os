import { parseDateOnly } from "@/lib/dates"
import { prisma } from "@/lib/prisma"

/**
 * The user's blocks that can show between two days (inclusive), and the changed days that matter there: changes to
 * days in the range, and days moved into it. Feed both to occurrences() for the same range
 */
export async function loadBlocks(userId: string, from: string, to: string) {
    const first = parseDateOnly(from)
    const last = parseDateOnly(to)
    const inRange = { gte: first, lte: last }

    const [blocks, exceptions] = await Promise.all([
        prisma.scheduleBlock.findMany({
            where: {
                userId,
                OR: [
                    // Started by the end of the range and not over before it begins
                    { startDate: { lte: last }, OR: [{ endsOn: null }, { endsOn: { gte: first } }] },
                    // A day moved into the range from outside it
                    { exceptions: { some: { newDate: inRange } } },
                ],
            },
        }),
        prisma.blockException.findMany({
            where: { block: { userId }, OR: [{ date: inRange }, { newDate: inRange }] },
        }),
    ])

    return { blocks, exceptions }
}
