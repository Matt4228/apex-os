"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { CalendarMinus, ChevronRight, Plus, Target } from "lucide-react"
import { assignBlock, planTask, updateTaskStatus } from "@/app/actions/tasks"
import { catProps } from "@/lib/categoryColor"
import CreateTaskForm from "@/components/tasks/CreateTaskForm"
import type { Task } from "@/components/tasks/types"
import TodaySchedule from "@/components/today/TodaySchedule"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDateOnly, parseDateOnly } from "@/lib/dates"
import { failureMessage } from "@/lib/optimistic"
import { buildToday, dueLabel, groupPlan, type PlanBlock } from "@/lib/today"
import { isHappening, useMinutesNow } from "@/lib/useMinutesNow"
import { usePop } from "@/lib/usePop"
import { useStoredToggles } from "@/lib/useStoredToggles"

type BoardTask = Task & { plannedFor: Date | null; scheduleBlockId: string | null }
type BoardGoal = { id: string; title: string; status: string }

const priorityStyles: Record<string, string> = {
    high: "bg-danger-tint text-danger-ink",
    medium: "bg-warning-tint text-warning-ink",
    low: "bg-success-tint text-success-ink",
}

// Radix reserves the empty string for "no choice", so "Anytime" needs a value of its own
const ANYTIME = "anytime"

// The short lists start open; the rest of the backlog starts closed so it doesn't bury them
const OPEN_BY_DEFAULT = { unfinished: true, urgent: true, "due-soon": true, "goal-steps": true, "everything-else": false }

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
    const sections = useStoredToggles("apex.today.suggestions", OPEN_BY_DEFAULT)

    // Goals read their steps from the same state, so planning or finishing a step moves "next step" on right away
    const { plan, unfinished, urgent, dueSoon, goalSteps, everythingElse } = buildToday({
        tasks,
        goals: goals.map(g => ({ ...g, targetValue: null, entries: [], tasks: tasks.filter(t => t.goalId === g.id) })),
        today,
    })
    // The rail's progress comes from the same grouping, so the plan and the rail always agree
    const { groups, anytime, progress } = groupPlan(plan, blocks)
    const doneCount = plan.filter(t => t.status === "done").length
    const nothingWaiting =
        unfinished.length + urgent.length + dueSoon.length + goalSteps.length + everythingElse.length === 0
    const withDue = (t: BoardTask) => ({ task: t, detail: joinDetails(t.dueDate && dueLabel(t.dueDate, today), t.goal?.title) })

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
            <TodaySchedule blocks={blocks} progress={progress} className="order-1 md:col-start-2 md:row-start-1" />

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

                {/* No task in a block yet: one flat list on a neutral panel, as before time-blocking */}
                {groups.length === 0 ? (
                    plan.length > 0 && <ul className="space-y-0.5 mb-3 rounded-lg bg-sunken p-1.5">{plan.map(row)}</ul>
                ) : (
                    <div className="space-y-3 mb-3">
                        {groups.map(({ block, tasks: blockTasks }) => (
                            <PlanGroup
                                key={block.id}
                                category={block.category}
                                current={isHappening(block, minutes)}
                                heading={
                                    <>
                                        <span className="tabular-nums">{block.startTime} to {block.endTime}</span>{" "}
                                        <span className="font-semibold">{block.label}</span>
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
                    id="unfinished"
                    title="Unfinished from before"
                    items={unfinished.map(t => ({
                        task: t,
                        detail: joinDetails(t.plannedFor && `planned ${formatDateOnly(t.plannedFor, "EEE")}`, t.goal?.title),
                    }))}
                    sections={sections}
                    onAdd={addToToday}
                />
                <SuggestionGroup id="urgent" title="Urgent" items={urgent.map(withDue)} sections={sections} onAdd={addToToday} />
                <SuggestionGroup
                    id="due-soon"
                    title="Due in the next week"
                    items={dueSoon.map(withDue)}
                    sections={sections}
                    onAdd={addToToday}
                />
                <SuggestionGroup
                    id="goal-steps"
                    title="Next steps for your goals"
                    items={goalSteps.map(({ goal, step }) => ({ task: step, detail: joinDetails(goal.title, step.dueDate && dueLabel(step.dueDate, today)) }))}
                    sections={sections}
                    onAdd={addToToday}
                />
                <SuggestionGroup
                    id="everything-else"
                    title="Everything else"
                    items={everythingElse.map(withDue)}
                    sections={sections}
                    onAdd={addToToday}
                />
            </section>
        </div>
    )
}

/**
 * One block's tasks on a panel tinted with the block's category; with no category the panel is neutral.
 * The block happening now gets the same outline as in the rail
 */
function PlanGroup({
    heading,
    category,
    current = false,
    children,
}: {
    heading: ReactNode
    category?: string | null
    current?: boolean
    children: ReactNode
}) {
    return (
        <div
            {...catProps(category)}
            aria-current={current ? "time" : undefined}
            className={`rounded-lg bg-cat-tint p-1.5 ${current ? "ring-2 ring-inset ring-cat-solid" : ""}`}
        >
            <h4 className="flex flex-wrap items-baseline gap-x-2 px-2 pt-1 mb-1 text-xs font-medium text-cat-ink">{heading}</h4>
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
    const block = blocks.find(b => b.id === task.scheduleBlockId)
    const pop = usePop()
    // A goal step takes its goal's color, anything else its block's, so a step reads as part of its goal
    const color = catProps(task.goal?.category?.trim() ? task.goal.category : block?.category)
    const checkColors = color["data-cat"] === undefined
        ? isDone ? "bg-accent border-accent" : "border-line-strong hover:border-accent"
        : isDone ? "bg-cat-solid border-cat-solid" : "border-cat-solid hover:bg-cat-tint"

    return (
        <li className={`flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface/70 transition-colors ${isDone ? "opacity-60" : ""}`}>
            <button
                {...color}
                role="checkbox"
                aria-checked={isDone}
                aria-label={task.title}
                onClick={() => {
                    if (!isDone) pop.start()
                    onToggle()
                }}
                onAnimationEnd={pop.end}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${checkColors} ${pop.className()}`}
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
            {/* A block that isn't on today's schedule reads "Anytime", like the group the task sits in.
                The trigger is given its text, so the server renders it too instead of an empty box */}
            {blocks.length > 0 && (
                <Select value={block?.id ?? ANYTIME} onValueChange={value => onMove(value === ANYTIME ? null : value)}>
                    <SelectTrigger aria-label={`Block for ${task.title}`} className="max-w-[9rem] flex-shrink-0">
                        <SelectValue>{block ? <BlockName block={block} /> : "Anytime"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value={ANYTIME}>Anytime</SelectItem>
                        {blocks.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                                <BlockName block={option} />
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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

/** "09:00 Deep work", with the time quieter than the name */
function BlockName({ block }: { block: PlanBlock }) {
    return (
        <>
            <span className="tabular-nums text-ink-muted">{block.startTime}</span> {block.label}
        </>
    )
}

/**
 * A collapsible list of tasks to plan. The heading is a button with the count beside it, so a closed
 * section still says what it holds, and closed tasks are hidden from the keyboard as well as the eye
 */
function SuggestionGroup({
    id,
    title,
    items,
    sections,
    onAdd,
}: {
    id: string
    title: string
    items: { task: BoardTask; detail: string }[]
    sections: { isOpen: (id: string) => boolean; toggle: (id: string) => void }
    onAdd: (id: string) => void
}) {
    if (items.length === 0) return null
    const open = sections.isOpen(id)
    const listId = `suggestions-${id}`

    return (
        <div className="mb-3">
            <h4>
                <button
                    aria-expanded={open}
                    aria-controls={listId}
                    onClick={() => sections.toggle(id)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted hover:bg-sunken hover:text-ink-soft transition-colors"
                >
                    <ChevronRight
                        size={14}
                        aria-hidden="true"
                        className={`flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
                    />
                    {title}
                    <span className="ml-auto tabular-nums">{items.length}</span>
                </button>
            </h4>
            <ul id={listId} hidden={!open} className="mt-1 space-y-0.5">
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