export type GoalOption = { id: string; title: string }

export type Task = {
    id: string
    title: string
    status: string
    priority: string
    dueDate: Date | null
    completedAt: Date | null
    createdAt: Date
    goalId?: string | null
    goal?: GoalOption | null
}