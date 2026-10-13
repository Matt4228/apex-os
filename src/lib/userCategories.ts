import { uniqueCategories } from "@/lib/categoryColor"
import { prisma } from "@/lib/prisma"

/** Every category the user has typed on a block, goal or habit, once each and sorted */
export async function getUserCategories(userId: string): Promise<string[]> {
    const where = { userId, category: { not: null } }
    const select = { category: true }
    const [blocks, goals, habits] = await Promise.all([
        prisma.scheduleBlock.findMany({ where, select, distinct: ["category"] }),
        prisma.goal.findMany({ where, select, distinct: ["category"] }),
        prisma.habit.findMany({ where, select, distinct: ["category"] }),
    ])
    return uniqueCategories([...blocks, ...goals, ...habits].map(row => row.category))
}
