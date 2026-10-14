"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createCompetition } from "@/app/actions/competitions"
import { Button } from "@/components/ui/button"
import { CategorySelect } from "@/components/ui/category-select"
import { Input } from "@/components/ui/input"
import { sundayOf } from "@/lib/competition"
import { formatDateOnly } from "@/lib/dates"

const MAX_METRICS = 3

type MetricDraft = { name: string; unit: string; every: string; targets: string[] }

const blankMetric = (weeks: number): MetricDraft => ({ name: "", unit: "", every: "", targets: Array(weeks).fill("") })

/**
 * A new competition: a name, a category, the week it starts, how many weeks it runs, and one to three metrics.
 * Each metric takes one target for every week, which fills the table below; then any week can be adjusted
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

    function changeWeeks(next: number) {
        const count = Math.min(Math.max(next || 1, 1), 26)
        setWeeks(count)
        // Keep the targets already typed; new weeks start from the "every week" target
        setMetrics(current => current.map(m => ({
            ...m,
            targets: Array.from({ length: count }, (_, i) => m.targets[i] ?? m.every),
        })))
    }

    function updateMetric(index: number, change: Partial<MetricDraft>) {
        setMetrics(current => current.map((m, i) => (i === index ? { ...m, ...change } : m)))
    }

    function setEvery(index: number, value: string) {
        updateMetric(index, { every: value, targets: Array(weeks).fill(value) })
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
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            <div className="space-y-4">
                <label className="block space-y-1">
                    <span className="text-xs text-ink-muted">Name</span>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="October Run Club" required autoFocus />
                </label>
                <div className="space-y-1">
                    <span className="text-xs text-ink-muted">Category</span>
                    <CategorySelect onChange={setCategory} />
                </div>
                <div className="flex flex-wrap gap-3">
                    <label className="flex-1 space-y-1">
                        <span className="text-xs text-ink-muted">Start week</span>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        {startDate && (
                            <span className="block text-xs text-ink-muted">Starts {formatDateOnly(sundayOf(startDate), "EEEE, MMM d")}</span>
                        )}
                    </label>
                    <label className="w-32 space-y-1">
                        <span className="text-xs text-ink-muted">Weeks</span>
                        <Input type="number" min={1} max={26} value={weeks} onChange={e => changeWeeks(Number(e.target.value))} required />
                    </label>
                </div>
            </div>

            {metrics.map((metric, index) => (
                <fieldset key={index} className="space-y-3 rounded-xl border border-line bg-surface p-4">
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
                        <label className="w-36 space-y-1">
                            <span className="text-xs text-ink-muted">Target every week</span>
                            <Input type="number" min={0} step="any" value={metric.every} onChange={e => setEvery(index, e.target.value)} />
                        </label>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="text-sm">
                            <caption className="sr-only">Targets for {metric.name || `metric ${index + 1}`}, by week</caption>
                            <tbody>
                                <tr>
                                    {metric.targets.map((target, week) => (
                                        <td key={week} className="pr-2 pb-1">
                                            <label className="block space-y-0.5 text-center">
                                                <span className="text-[11px] text-ink-muted">Week {week + 1}</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={target}
                                                    onChange={e => setTarget(index, week, e.target.value)}
                                                    className="h-9 w-20 text-center"
                                                    required
                                                />
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
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
