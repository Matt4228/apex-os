import type { GoalOption } from "./types"

/** Picker for a task's goal. Keeps the current goal as an option even if it is no longer
 *  active, so saving the form doesn't quietly unlink it */
export default function GoalSelect({ goals, current }: { goals: GoalOption[]; current?: GoalOption | null }) {
const options = current && !goals.some(g => g.id === current.id) ? [current, ...goals] : goals

return (
    <select
        name="goalId"
        aria-label="Goal"
        defaultValue={current?.id ?? ""}
        className="flex h-10 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
    >
        <option value="">No goal</option>
        {options.map(goal => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
        ))}
    </select>
)
}