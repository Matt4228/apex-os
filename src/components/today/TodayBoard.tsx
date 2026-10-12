"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { CalendarMinus, Plus, Target } from "lucide-react"
import { assignBlock, planTask, updateTaskStatus } from "@/app/actions/tasks"
import CreateTaskForm from "@/components/tasks/CreateTaskForm"
import type { Task } from "@/components/tasks/types"
import TodaySchedule from "@/components/today/TodaySchedule"
import { formatDateOnly, parseDateOnly } from "@/lib/dates"
import { failureMessage } from "@/lib/optimistic"
import { buildToday, dueLabel, groupPlan, type PlanBlock } from "@/lib/today"
import { isHappening, useMinutesNow } from "@/lib/useMinutesNow"

type BoardTask = Task & { plannedFor: Date | null; scheduleBlockId: string | null }
type BoardGoal = { id: string; title: string; status: string }

const priorityStyles: Record<string, string> = {
    high: "bg-danger/10 text-danger-ink",
    medium: "bg-warning/10 text-warning-ink",
    low: "bg-success/10 text-success-ink",
}

/** "2 days overdue · Ship an open source contribution": the parts that exist, joined */
const joinDetails = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ")

export default function TodayBoard({
    initialTasks,
    goals,
    today,
    blocks = [],
}: {
    initialTasks: BoardTask[]
    goals: BoardGoal[]
    today: string
    blocks?: PlanBlock[]
}) {
    const [tasks, setTasks] = useState(initialTasks)
    const [error, setError] = useState<string | null>(null)
    const minutes = useMinutesNow()

    // Goals read their steps from the same state, so planning or finishing a step moves "next step" on right away
    const { plan, unfinished, urgent, goalSteps } = buildToday({
        tasks,
        goals: goals.map(g => ({ ...g, targetValue: null, entries: [], tasks: tasks.filter(t => t.goalId === g.id) })),
        today,
    })
    // The rail's counts come from the same grouping, so the plan and the rail always agree
    const { groups, anytime, counts } = groupPlan(plan, blocks)
    const doneCount = plan.filter(t => t.status === "done").length
    const nothingWaiting = unfinished.length + urgent.length + goalSteps.length === 0

    /** Change one task on screen now; put it back and explain if the server says no */
    async function change(id: string, update: Partial<BoardTask>, save: () => Promise<unknown>, what: string) {
        const before = tasks.find(t => t.id === id)
        if (!before) return
        setError(null)
        setTasks(current => current.map(t => (t.id === id ? { ...t, ...update } : t)))

        const problem = await failureMessage(save(), what)
        if (problem) {
            setTasks(current => current.map(t => (t.id === id ? before : t)))
            setError(problem)
        }
    }

    function toggle(task: BoardTask) {
        const status = task.status === "done" ? "todo" : "done"
        return change(task.id, { status }, () => updateTaskStatus(task.id, status), "update that task")
    }

    // Planning changes always start the task at anytime, matching planTask on the server
    function addToToday(id: string) {
        return change(id, { plannedFor: parseDateOnly(today), scheduleBlockId: null }, () => planTask(id, true), "add that to today")
    }

    function notToday(id: string) {
        return change(id, { plannedFor: null, scheduleBlockId: null }, () => planTask(id, false), "take that off today")
    }

    function moveToBlock(id: string, scheduleBlockId: string | null) {
        return change(id, { scheduleBlockId }, () => assignBlock(id, scheduleBlockId), "move that task")
    }

    function handleCreated(task: Task) {
        setTasks(current => [...current, { ...task, plannedFor: parseDateOnly(today), scheduleBlockId: null }])
    }

    const row = (task: BoardTask) => (
        <PlanRow
            key={task.id}
            task={task}
            today={today}
            blocks={blocks}
            onToggle={() => toggle(task)}
            onRemove={() => notToday(task.id)}
            onMove={blockId => moveToBlock(task.id, blockId)}
        />
    )

    return (
        // "contents" lets the page grid place these sections directly, so habits can sit between them on mobile
        <div className="contents">
            <TodaySchedule blocks={blocks} counts={counts} className="order-1 md:col-start-2 md:row-start-1" />

            <section aria-labelledby="plan-heading" className="order-2 md:col-start-1 md:row-start-1">
                <div className="flex items-baseline justify-between mb-3">
                    <h3 id="plan-heading" className="text-sm font-semibold text-ink">Today&apos;s plan</h3>
                    {plan.length > 0 && (
                        <span className="text-xs text-ink-muted">{doneCount} of {plan.length} done</span>
                    )}
                </div>

                {error && <p role="alert" className="text-sm text-danger-ink mb-3">{error}</p>}

                {plan.length === 0 && (
                    <p className="text-sm text-ink-muted mb-3">Nothing planned yet. Pick from the suggestions below, or add a task.</p>
                )}

                {/* No task in a block yet: one flat list, as before time-blocking */}
                {groups.length === 0 ? (
                    <ul className="space-y-0.5 mb-3">{plan.map(row)}</ul>
                ) : (
                    <div className="space-y-4 mb-3">
                        {groups.map(({ block, tasks: blockTasks }) => (
                            <PlanGroup
                                key={block.id}
                                current={isHappening(block, minutes)}
                                heading={
                                    <>
                                        <span className="tabular-nums">{block.startTime} to {block.endTime}</span>{" "}
                                        <span className="text-ink-soft">{block.label}</span>
                                    </>
                                }
                            >
                                {blockTasks.map(row)}
                            </PlanGroup>
                        ))}
                        {anytime.length > 0 && <PlanGroup heading="Anytime today">{anytime.map(row)}</PlanGroup>}
                    </div>
                )}

                <CreateTaskForm planToday onCreated={handleCreated} />
            </section>

            <section aria-labelledby="suggestions-heading" className="order-4 md:col-start-1 md:row-start-2">
                <h3 id="suggestions-heading" className="text-sm font-semibold text-ink mb-3">Add to today</h3>

                {nothingWaiting && <p className="text-sm text-ink-muted">Nothing else waiting.</p>}

                <SuggestionGroup
                    title="Unfinished from before"
                    items={unfinished.map(t => ({
                        task: t,
                        detail: joinDetails(t.plannedFor && `planned ${formatDateOnly(t.plannedFor, "EEE")}`, t.goal?.title),
                    }))}
                    onAdd={addToToday}
                />
                <SuggestionGroup
                    title="Urgent"
                    items={urgent.map(t => ({ task: t, detail: joinDetails(t.dueDate && dueLabel(t.dueDate, today), t.goal?.title) }))}
                    onAdd={addToToday}
                />
                <SuggestionGroup
                    title="Next steps for your goals"
                    items={goalSteps.map(({ goal, step }) => ({ task: step, detail: joinDetails(goal.title, step.dueDate && dueLabel(step.dueDate, today)) }))}
                    onAdd={addToToday}
                />
            </section>
        </div>
    )
}

/** One block's tasks under a heading; the block happening now gets the same purple bar as in the rail */
function PlanGroup({ heading, current = false, children }: { heading: ReactNode; current?: boolean; children:
ReactNode }) {
    return (
        <div
            aria-current={current ? "time" : undefined}
            className={`relative ${current ? "before:absolute before:left-0 before:inset-y-1 before:w-0.5 before:rounded-full before:bg-primary-ink" : ""}`}
        >
            <h4 className="flex flex-wrap items-baseline gap-x-2 px-2 mb-1 text-xs font-medium text-ink-muted">{heading}</h4>
            <ul className="space-y-0.5">{children}</ul>
        </div>
    )
}

function PlanRow({
    task,
    today,
    blocks,
    onToggle,
    onRemove,
    onMove,
}: {
    task: BoardTask
    today: string
    blocks: PlanBlock[]
    onToggle: () => void
    onRemove: () => void
    onMove: (blockId: string | null) => void
}) {
    const isDone = task.status === "done"

    return (
        <li className={`flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sunken transition-colors ${isDone ? "opacity-60" : ""}`}>
            <button
                role="checkbox"
                aria-checked={isDone}
                aria-label={task.title}
                onClick={onToggle}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    isDone ? "bg-accent border-accent" : "border-line-strong hover:border-accent"
                }`}
            />
            <div className="flex-1 min-w-0">
                <p className={`text-sm text-ink ${isDone ? "line-through" : ""}`}>{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-ink-muted">
                    <span className={`font-medium px-1.5 py-0.5 rounded-full ${priorityStyles[task.priority] ?? ""}`}>
                        {task.priority}
                    </span>
                    {task.dueDate && !isDone && <span>{dueLabel(task.dueDate, today)}</span>}
                    {task.goal && (
                        <Link
                            href={`/dashboard/goals/${task.goal.id}`}
                            className="inline-flex items-center gap-1 hover:text-ink-soft transition-colors"
                        >
                            <Target size={12} aria-hidden="true" />
                            {task.goal.title}
                        </Link>
                    )}
                </div>
            </div>
            {/* A native select: keyboard and screen reader support for free, and the system picker on phones.
                A block that isn't on today's schedule matches no option, so it reads "Anytime", like its group */}
            {blocks.length > 0 && (
                <select
                    aria-label={`Block for ${task.title}`}
                    value={task.scheduleBlockId ?? ""}
                    onChange={e => onMove(e.target.value || null)}
                    className="max-w-[9rem] flex-shrink-0 truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink-muted hover:border-line focus:border-line-strong transition-colors"
                >
                    <option value="" className="bg-surface text-ink">Anytime</option>
                    {blocks.map(block => (
                        <option key={block.id} value={block.id} className="bg-surface text-ink">
                            {block.startTime} {block.label}
                        </option>
                    ))}
                </select>
            )}
            <button
                onClick={onRemove}
                aria-label={`Not today: ${task.title}`}
                title="Not today"
                className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-sunken-strong transition-colors flex-shrink-0"
            >
                <CalendarMinus size={16} aria-hidden="true" />
            </button>
        </li>
    )
}

function SuggestionGroup({
    title,
    items,
    onAdd,
}: {
    title: string
    items: { task: BoardTask; detail: string }[]
    onAdd: (id: string) => void
}) {
    if (items.length === 0) return null

    return (
        <div className="mb-5">
            <h4 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">{title}</h4>
            <ul className="space-y-0.5">
                {items.map(({ task, detail }) => (
                    <li key={task.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sunken transition-colors">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-ink-soft">{task.title}</p>
                            {detail && <p className="text-xs text-ink-muted mt-0.5">{detail}</p>}
                        </div>
                        <button
                            onClick={() => onAdd(task.id)}
                            aria-label={`Add to today: ${task.title}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-ink hover:bg-sunken-strong transition-colors flex-shrink-0"
                        >
                            <Plus size={14} aria-hidden="true" />
                            Today
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}