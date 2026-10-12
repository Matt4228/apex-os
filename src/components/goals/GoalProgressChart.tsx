"use client"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts"
import { format } from "date-fns"
import { trackedValue } from "@/lib/goalProgress"

type Entry = {
    id: string
    value: number
    note: string | null
    loggedOn: Date
}

export default function GoalProgressChart({
    entries,
    targetValue,
    unit,
    tracking,
}: {
    entries: Entry[]
    targetValue: number | null
    unit: string | null
    tracking?: string
}) {
    if (entries.length === 0) {
        return (
            <p className="text-xs text-ink-muted py-4 text-center">
                No entries logged yet. Log your first progress entry to see the chart.
            </p>
        )
    }

    const sorted = [...entries].sort(
        (a, b) => new Date(a.loggedOn).getTime() - new Date(b.loggedOn).getTime()
    )

    const data = sorted.map((e, i) => ({
        date: format(new Date(e.loggedOn), "MMM d"),
        // A running total plots the sum so far, so the line climbs toward the target
        value: tracking === "total" ? trackedValue(sorted.slice(0, i + 1), "total") : e.value,
        note: e.note,
    }))

    return (
        <div className="mt-4 pt-4 border-t border-line">
            <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
                Progress over time {unit && `(${unit})`}
            </p>
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis 
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null
                            return (
                            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px", fontSize: "12px" }}>
                                <p style={{ color: "#94a3b8", marginBottom: 2 }}>{label}</p>
                                <p style={{ color: "#1B998B", fontWeight: 500 }}>
                                {payload[0].value}{unit ? ` ${unit}` : ""}
                                </p>
                            </div>
                            )
                        }}
                    />
                    {targetValue && (
                        <ReferenceLine 
                            y={targetValue}
                            stroke="#1B998B"
                            strokeDasharray="4 4"
                            label={{
                                value: `Target: ${targetValue}${unit ? " " + unit : ""}`,
                                fontSize: 10,
                                fill: "#1B998B",
                                position: "insideTopRight",
                            }}
                        />
                    )}
                    <Line 
                        type="monotone"
                        dataKey="value"
                        stroke="#1B998B"
                        strokeWidth={2}
                        dot={{ fill: "#1B998B", r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}