// src/lib/goalProgress.ts

export type Step = { id: string; title: string; status: string; dueDate: Date | null; createdAt: Date }

export type GoalProgress<T extends Step = Step> =
    | { kind: "steps"; done: number; total: number; percent: number; nextStep: T | null }
    | { kind: "numeric"; percent: number; value: number; loggedOn: Date }
    | { kind: "none" }

type ProgressGoal<T extends Step> = {
    targetValue: number | null
    entries: { value: number; loggedOn: Date }[]
    tasks: T[]
}

/** Earliest due date first, undated steps last; ties keep the order they were added */
export function sortSteps<T extends Step>(steps: T[]): T[] {
    const dueTime = (s: Step) => (s.dueDate ? new Date(s.dueDate).getTime() : Infinity)
    const created = (s: Step) => new Date(s.createdAt).getTime()

    // Two undated steps give Infinity - Infinity = NaN, which is falsy, so they fall through to creation order
    return [...steps].sort((a, b) => dueTime(a) - dueTime(b) || created(a) - created(b))
}

/** Steps decide progress when a goal has any; otherwise the latest logged value against the target */
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

    const latest = goal.entries.reduce((newest, e) =>
        new Date(e.loggedOn).getTime() > new Date(newest.loggedOn).getTime() ? e : newest
    )
    const percent = Math.round((latest.value / goal.targetValue) * 100)
    return {
        kind: "numeric",
        percent: Math.min(Math.max(percent, 0), 100),
        value: latest.value,
        loggedOn: latest.loggedOn,
    }
}