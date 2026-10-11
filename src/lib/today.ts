// src/lib/today.ts
import { sortTasksByPriority } from "./dashboardStats"
import { toDateInputValue } from "./dates"
import { goalProgress, type Step } from "./goalProgress"

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
 * checked in this order: planned for today, unfinished from an earlier plan, urgent, goal next step.
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

    const goalSteps = goals
        .filter(g => g.status === "active")
        .flatMap(g => {
            const progress = goalProgress(g)
            const step = progress.kind === "steps" ? progress.nextStep : null
            return step && !shown.has(step.id) ? [{ goal: { id: g.id, title: g.title }, step }] : []
        })

    return { plan, unfinished, urgent, goalSteps }
}