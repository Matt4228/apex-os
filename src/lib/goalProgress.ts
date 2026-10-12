// src/lib/goalProgress.ts

export type Step = { id: string; title: string; status: string; dueDate: Date | null; createdAt: Date }

export type GoalProgress<T extends Step = Step> =
    | { kind: "steps"; done: number; total: number; percent: number; nextStep: T | null }
    | { kind: "numeric"; percent: number; value: number; loggedOn: Date }
    | { kind: "none" }

/** How a numeric goal's entries add up: the newest value, their sum, or the highest one */
export const TRACKING = ["latest", "total", "best"] as const
export type Tracking = (typeof TRACKING)[number]

type ProgressGoal<T extends Step> = {
    targetValue: number | null
    /** Leave out for "latest", the original behavior */
    tracking?: string
    entries: { value: number; loggedOn: Date }[]
    tasks: T[]
}

/** The number a goal has reached so far. Sums are rounded to 2 places so 0.1 + 0.2 shows as 0.3 */
export function trackedValue(entries: { value: number; loggedOn: Date }[], tracking = "latest"): number {
    if (tracking === "total") return Math.round(entries.reduce((sum, e) => sum + e.value, 0) * 100) / 100
    if (tracking === "best") return Math.max(...entries.map(e => e.value))
    return newest(entries).value
}

function newest<E extends { loggedOn: Date }>(entries: E[]): E {
    return entries.reduce((latest, e) =>
        new Date(e.loggedOn).getTime() > new Date(latest.loggedOn).getTime() ? e : latest
    )
}

/** Earliest due date first, undated steps last; ties keep the order they were added */
export function sortSteps<T extends Step>(steps: T[]): T[] {
    const dueTime = (s: Step) => (s.dueDate ? new Date(s.dueDate).getTime() : Infinity)
    const created = (s: Step) => new Date(s.createdAt).getTime()

    // Two undated steps give Infinity - Infinity = NaN, which is falsy, so they fall through to creation order
    return [...steps].sort((a, b) => dueTime(a) - dueTime(b) || created(a) - created(b))
}

/** Steps decide progress when a goal has any; otherwise the tracked value against the target */
export function goalProgress<T extends Step>(goal: ProgressGoal<T>): GoalProgress<T> {
    if (goal.tasks.length > 0) {
        const done = goal.tasks.filter(t => t.status === "done").length
        const total = goal.tasks.length
        return {
            kind: "steps",
            done,
            total,
            percent: Math.round((done / total) * 100),
            nextStep: sortSteps(goal.tasks).find(t => t.status !== "done") ?? null,
        }
    }

    // A target of 0 would divide by zero, so it counts as no target
    if (!goal.targetValue || goal.entries.length === 0) return { kind: "none" }

    const value = trackedValue(goal.entries, goal.tracking)
    const percent = Math.round((value / goal.targetValue) * 100)
    return {
        kind: "numeric",
        percent: Math.min(Math.max(percent, 0), 100),
        value,
        loggedOn: newest(goal.entries).loggedOn,
    }
}