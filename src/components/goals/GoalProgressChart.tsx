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
}: {
    entries: Entry[]
    targetValue: number | null
    unit: string | null
}) {
    if (entries.length === 0) {
        return (
            <p className="text-xs text-slate-400 py-4 text-center">
                No entries logged yet. Log your first progress entry to see the chart.
            </p>
        )
    }

    const sorted = [...entries].sort(
        (a, b) => new Date(a.loggedOn).getTime() - new Date(b.loggedOn).getTime()
    )

    const data = sorted.map(e => ({
        date: format(new Date(e.loggedOn), "MMM d"),
        value: e.value,
        note: e.note,
    }))

    return (
        <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                Progress over tiime {unit && `(${unit})`}
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