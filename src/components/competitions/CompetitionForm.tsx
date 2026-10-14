"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createCompetition } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"
import { CategorySelect } from "@/components/ui/category-select"
import { Input } from "@/components/ui/input"
import { catProps } from "@/lib/categoryColor"
import { monthGroups, rampTargets, sundayOf } from "@/lib/competition"
import { formatDateOnly } from "@/lib/dates"

const MAX_METRICS = 3
/** Matches the server: up to three years */
const MAX_WEEKS = 156

type MetricDraft = {
    name: string
    unit: string
    mode: "same" | "ramp"
    every: string
    first: string
    last: string
    roundTo: string
    targets: string[]
}

const blankMetric = (weeks: number): MetricDraft => ({
    name: "",
    unit: "",
    mode: "same",
    every: "",
    first: "",
    last: "",
    roundTo: "1",
    targets: Array(weeks).fill(""),
})

/** The targets a metric's settings make: one number for every week, or a steady ramp from the first to the last */
function generated(m: MetricDraft, weeks: number): string[] {
    if (m.mode === "same") return Array(weeks).fill(m.every)
    if (m.first === "" || m.last === "") return Array(weeks).fill("")
    return rampTargets(Number(m.first), Number(m.last), weeks, Number(m.roundTo)).map(String)
}

/** A small bar per week, so a ramp's shape shows before anything is saved */
function Bars({ targets }: { targets: string[] }) {
    const values = targets.map(Number).filter(v => v > 0)
    const max = Math.max(...values, 1)
    if (values.length === 0) return null
    return (
        <div aria-hidden="true" data-testid="target-bars" className="flex h-16 items-end gap-px border-b border-line">
            {targets.map((t, i) => (
                <i key={i} className="min-w-[2px] flex-1 rounded-t-sm bg-cat-solid opacity-85" style={{ height: `${Math.max(4, (Number(t) / max) * 100)}%` }} />
            ))}
        </div>
    )
}

/**
 * A new competition: a name, a category, the week it starts, how many weeks it runs (up to three years), and one to
 * three metrics. Each metric's targets come from one number for every week or a ramp; single weeks can then be
 * changed, folded by month so a long competition stays short
 */
export default function CompetitionForm({ today }: { today: string }) {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [category, setCategory] = useState("")
    const [startDate, setStartDate] = useState(today)
    const [weeks, setWeeks] = useState(4)
    const [metrics, setMetrics] = useState<MetricDraft[]>([blankMetric(4)])
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const groups = monthGroups({ startDate: sundayOf(startDate || today), weeks })

    function changeWeeks(next: number) {
        const count = Math.min(Math.max(next || 1, 1), MAX_WEEKS)
        setWeeks(count)
        // A ramp stretches to the new length; with one target for every week, typed weeks are kept and new weeks get it
        setMetrics(current => current.map(m => ({
            ...m,
            targets: m.mode === "ramp" ? generated(m, count) : Array.from({ length: count }, (_, i) => m.targets[i] ?? m.every),
        })))
    }

    /** Changing how targets are made rewrites every week from it */
    function updateRule(index: number, change: Partial<MetricDraft>) {
        setMetrics(current => current.map((m, i) => {
            if (i !== index) return m
            const next = { ...m, ...change }
            return { ...next, targets: generated(next, weeks) }
        }))
    }

    function updateMetric(index: number, change: Partial<MetricDraft>) {
        setMetrics(current => current.map((m, i) => (i === index ? { ...m, ...change } : m)))
    }

    function setTarget(index: number, week: number, value: string) {
        updateMetric(index, { targets: metrics[index].targets.map((t, w) => (w === week ? value : t)) })
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        setError(null)

        const formData = new FormData()
        formData.set("title", title)
        formData.set("category", category)
        formData.set("startDate", startDate)
        formData.set("weeks", String(weeks))
        formData.set("metrics", JSON.stringify(metrics.map(m => ({ name: m.name, unit: m.unit, targets: m.targets.map(Number) }))))

        const result = await createCompetition(formData)
        setSaving(false)
        if (!result || "error" in result) {
            setError(result?.error ?? "Something went wrong")
            return
        }
        if (result.competition) router.push(`/dashboard/competitions/${result.competition.id}`)
    }

    return (
        <form onSubmit={handleSubmit} {...catProps(category)} className="max-w-3xl space-y-6">
            <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
                <label className="block space-y-1">
                    <span className="text-xs text-ink-muted">Name</span>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Year of Running" required autoFocus />
                </label>
                <div className="space-y-1">
                    <span className="text-xs text-ink-muted">Category</span>
                    <CategorySelect onChange={setCategory} />
                </div>
                <div className="flex flex-wrap gap-3">
                    {/* Hints sit outside the labels, so each field's name stays just its label */}
                    <div className="min-w-44 flex-1 space-y-1">
                        <label className="block space-y-1">
                            <span className="text-xs text-ink-muted">Start week</span>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        </label>
                        {startDate && (
                            <p className="text-xs text-ink-muted">Starts {formatDateOnly(sundayOf(startDate), "EEEE, MMM d")}</p>
                        )}
                    </div>
                    <div className="w-32 space-y-1">
                        <label className="block space-y-1">
                            <span className="text-xs text-ink-muted">Weeks</span>
                            <Input type="number" min={1} max={MAX_WEEKS} value={weeks} onChange={e => changeWeeks(Number(e.target.value))} required />
                        </label>
                        <p className="text-xs text-ink-muted">Up to 156 (3 years)</p>
                    </div>
                </div>
            </div>

            {metrics.map((metric, index) => (
                <fieldset key={index} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
                    <legend className="px-1 text-sm font-semibold text-ink">Metric {index + 1}</legend>
                    <div className="flex flex-wrap gap-3">
                        <label className="min-w-40 flex-1 space-y-1">
                            <span className="text-xs text-ink-muted">What you measure</span>
                            <Input value={metric.name} onChange={e => updateMetric(index, { name: e.target.value })} placeholder="km run" required />
                        </label>
                        <label className="w-28 space-y-1">
                            <span className="text-xs text-ink-muted">Unit (optional)</span>
                            <Input value={metric.unit} onChange={e => updateMetric(index, { unit: e.target.value })} placeholder="km" />
                        </label>
                    </div>

                    <div role="group" aria-label={`How metric ${index + 1}'s targets are set`} className="inline-flex gap-0.5 rounded-lg bg-sunken p-0.5">
                        {(["same", "ramp"] as const).map(mode => (
                            <button
                                key={mode}
                                type="button"
                                aria-pressed={metric.mode === mode}
                                onClick={() => updateRule(index, { mode })}
                                className={`rounded-md px-3 py-1 text-xs font-medium ${metric.mode === mode ? "bg-surface text-ink shadow-sm" : "text-ink-soft"}`}
                            >
                                {mode === "same" ? "Same every week" : "Ramp"}
                            </button>
                        ))}
                    </div>

                    {metric.mode === "same" ? (
                        <label className="block w-40 space-y-1">
                            <span className="text-xs text-ink-muted">Target every week</span>
                            <Input type="number" min={0} step="any" value={metric.every} onChange={e => updateRule(index, { every: e.target.value })} />
                        </label>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            <label className="w-32 space-y-1">
                                <span className="text-xs text-ink-muted">First week</span>
                                <Input type="number" min={0} step="any" value={metric.first} onChange={e => updateRule(index, { first: e.target.value })} />
                            </label>
                            <label className="w-32 space-y-1">
                                <span className="text-xs text-ink-muted">Last week</span>
                                <Input type="number" min={0} step="any" value={metric.last} onChange={e => updateRule(index, { last: e.target.value })} />
                            </label>
                            <label className="w-28 space-y-1">
                                <span className="text-xs text-ink-muted">Round to</span>
                                <select
                                    value={metric.roundTo}
                                    onChange={e => updateRule(index, { roundTo: e.target.value })}
                                    className="h-10 w-full rounded-md border border-line bg-surface px-2 text-sm text-ink"
                                >
                                    <option value="0.5">0.5</option>
                                    <option value="1">1</option>
                                    <option value="5">5</option>
                                </select>
                            </label>
                        </div>
                    )}

                    <Bars targets={metric.targets} />

                    <details className="rounded-xl border border-line">
                        <summary className="cursor-pointer px-3 py-2 text-sm text-ink-soft">Adjust single weeks</summary>
                        <div className="space-y-3 px-3 pb-3">
                            {groups.map(({ month, weeks: inMonth }) => (
                                <div key={month} className="space-y-1">
                                    <p className="text-xs font-medium text-ink-muted">{formatDateOnly(`${month}-01`, "MMMM yyyy")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {inMonth.map(week => (
                                            <label key={week} className="space-y-0.5 text-center">
                                                <span className="block text-[11px] text-ink-muted">Week {week}</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={metric.targets[week - 1] ?? ""}
                                                    onChange={e => setTarget(index, week - 1, e.target.value)}
                                                    className="h-9 w-20 text-center"
                                                    required
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>

                    {metrics.length > 1 && (
                        <button
                            type="button"
                            onClick={() => setMetrics(current => current.filter((_, i) => i !== index))}
                            className="text-xs text-ink-muted hover:text-danger-ink"
                        >
                            Remove this metric
                        </button>
                    )}
                </fieldset>
            ))}

            {metrics.length < MAX_METRICS && (
                <Button type="button" variant="outline" size="sm" onClick={() => setMetrics(current => [...current, blankMetric(weeks)])}>
                    + Add a metric
                </Button>
            )}

            {error && <p role="alert" className="text-sm text-danger-ink">{error}</p>}

            <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create competition"}</Button>
                <Button asChild variant="ghost">
                    <Link href="/dashboard/competitions">Cancel</Link>
                </Button>
            </div>
        </form>
    )
}
