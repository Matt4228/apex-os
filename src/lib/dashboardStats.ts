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