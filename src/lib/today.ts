// src/lib/today.ts
import { sortTasksByPriority } from "./dashboardStats"
import { formatDateOnly, parseDateOnly, toDateInputValue } from "./dates"
import { sortSteps, type Step } from "./goalProgress"

const DAY_MS = 24 * 60 * 60 * 1000

export type TodayTask = Step & { priority: string; plannedFor: Date | null }

export type TodayGoal<T extends TodayTask> = {
    id: string
    title: string
    status: string
    targetValue: number | null
    entries: { value: number; loggedOn: Date }[]
    tasks: T[]
}

/**
 * Splits tasks into what the today page shows. Each task lands in at most one group,
 * checked in this order: planned for today, unfinished from an earlier plan, urgent, due in the next 7 days,
 * goal next step, then every other open task, so the whole backlog can be planned from one page.
 * `today` is the user's calendar day, "YYYY-MM-DD"
 */
export function buildToday<T extends TodayTask>({
    tasks,
    goals,
    today,
}: {
    tasks: T[]
    goals: TodayGoal<T>[]
    today: string
}) {
    // Stored dates are midnight UTC, so their "YYYY-MM-DD" form compares correctly as text
    const isOpen = (t: T) => t.status !== "done"

    const planned = tasks.filter(t => t.plannedFor !== null && toDateInputValue(t.plannedFor) === today)
    const plan = [
        ...sortTasksByPriority(planned.filter(isOpen)),
        ...planned.filter(t => !isOpen(t)),
    ]

    const unfinished = sortTasksByPriority(
        tasks.filter(t => isOpen(t) && t.plannedFor !== null && toDateInputValue(t.plannedFor) < today)
    )

    const shown = new Set([...plan, ...unfinished].map(t => t.id))

    const urgent = sortTasksByPriority(
        tasks.filter(t => isOpen(t) && !shown.has(t.id) && t.dueDate !== null && toDateInputValue(t.dueDate) <= today)
    )
    urgent.forEach(t => shown.add(t.id))

    const weekOut = toDateInputValue(new Date(parseDateOnly(today).getTime() + 7 * DAY_MS))
    const dueSoon = sortTasksByPriority(
        tasks.filter(t => isOpen(t) && !shown.has(t.id) && t.dueDate !== null && toDateInputValue(t.dueDate) <= weekOut)
    )
    dueSoon.forEach(t => shown.add(t.id))

    // Each goal suggests its first open step that isn't already on the page,
    // so planning a goal's next step brings up the one after it
    const goalSteps = goals
        .filter(g => g.status === "active")
        .flatMap(g => {
            const step = sortSteps(g.tasks).find(t => isOpen(t) && !shown.has(t.id))
            return step ? [{ goal: { id: g.id, title: g.title }, step }] : []
        })
    goalSteps.forEach(({ step }) => shown.add(step.id))

    const everythingElse = sortTasksByPriority(tasks.filter(t => isOpen(t) && !shown.has(t.id)))

    return { plan, unfinished, urgent, dueSoon, goalSteps, everythingElse }
}

/** How a due date reads on the today page: "due today", "due tomorrow", "2 days overdue", "due Oct 20" */
export function dueLabel(dueDate: Date, today: string): string {
    const days = Math.round((parseDateOnly(toDateInputValue(dueDate)).getTime() - parseDateOnly(today).getTime()) / DAY_MS)
    if (days === 0) return "due today"
    if (days === 1) return "due tomorrow"
    if (days === -1) return "1 day overdue"
    if (days < 0) return `${-days} days overdue`
    return `due ${formatDateOnly(dueDate, "MMM d")}`
}

export type PlanBlock = { id: string; startTime: string; endTime: string; label: string; category?: string | null }

export type BlockProgress = { done: number; total: number }

/**
 * Splits today's plan by schedule block, in time order, keeping the plan's order inside each block.
 * Tasks with no block, or whose block isn't on today's schedule any more, go under anytime,
 * so nothing planned disappears. `progress` feeds "1 of 3 done" in the schedule rail
 */
export function groupPlan<T extends { scheduleBlockId: string | null; status: string }, B extends PlanBlock>(plan: T[], blocks: B[]) {
    // "HH:MM" text sorts in time order because hours are zero padded
    const groups = [...blocks]
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map(block => ({ block, tasks: plan.filter(t => t.scheduleBlockId === block.id) }))
        .filter(group => group.tasks.length > 0)

    const todaysBlocks = new Set(blocks.map(b => b.id))
    const anytime = plan.filter(t => t.scheduleBlockId === null || !todaysBlocks.has(t.scheduleBlockId))

    const progress: Record<string, BlockProgress> = Object.fromEntries(
        groups.map(g => [g.block.id, { done: g.tasks.filter(t => t.status === "done").length, total: g.tasks.length }])
    )

    return { groups, anytime, progress }
}