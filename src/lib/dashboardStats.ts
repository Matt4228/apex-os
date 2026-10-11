export function countTaskStatuses(tasks: { status: string }[]): { todoCount: number; doneCount: number } {
    return {
        todoCount: tasks.filter((task) => task.status === "todo").length,
        doneCount: tasks.filter((task) => task.status === "done").length,
    }
}

export function countGoalStatuses(goals: {status: string }[]): { todoCount: number; doneCount: number } {
    return {
        todoCount: goals.filter((goal) => goal.status === "active").length,
        doneCount: goals.filter((goal) => goal.status === "complete").length,
    }
}

// Priority is stored as text, so the database would sort it alphabetically
// ("medium" > "low" > "high").  Rank it explicitly instead
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2}

type SortableTask = { priority: string; dueDate: Date | null; createdAt: Date }

/** High priority first, then soonest due date (none last), then newest */
export function sortTasksByPriority<T extends SortableTask>(tasks: T[]): T[] {
    const dueTime = (t: SortableTask) => (t.dueDate ? new Date(t.dueDate).getTime() : Infinity)

    return [...tasks].sort(
        (a, b) =>
            (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) ||
            dueTime(a) - dueTime(b) || 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}

/** Distinct weeks marked complete. Entries are stored per week *per metric */
export function countCompletedWeeks(entries: { weekNumber: number; weekComplete: boolean}[]): number {
    return new Set(entries.filter(e => e.weekComplete).map(e => e.weekNumber)).size
}