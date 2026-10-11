import type { Step } from "@/lib/goalProgress"

export type Entry = {
    id: string
    value: number
    note: string | null
    loggedOn: Date
}

/** A step is a task linked to a goal; these are the fields the goal screens use */
export type GoalStep = Step & { priority: string; completedAt: Date | null }

export type Goal = {
    id: string
    title: string
    description: string | null
    category: string | null
    status: string
    targetDate: Date | null
    targetValue: number | null
    unit: string | null
    entries: Entry[]
    tasks: GoalStep[]
}