const HOURS = Array.from({ length: 24 }, (_, i) => i)

/** "07:00": 24-hour, like every other time in the app */
const formatHour = (hour: number) => `${String(hour).padStart(2, "0")}:00`

export default function HourLabels({ pxPerMinute }: { pxPerMinute: number}) {
    return (
        <div className="relative flex-shrink-0 w-14" style={{ height: 24 * 60 * pxPerMinute }}>
            {/* Midnight at the very top would be cut in half, so the labels start at 01:00 */}
            {HOURS.slice(1).map(hour => (
                <div
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-ink-muted tabular-nums"
                    style={{ top: hour * 60 * pxPerMinute }}
                >
                    {formatHour(hour)}
                </div>
            ))}
        </div>
    )
}