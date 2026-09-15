const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(hour: number): string {
    if (hour === 0) return "12 AM"
    if (hour === 12) return "12 PM"
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

export default function HourLabels({ pxPerMinute }: { pxPerMinute: number}) {
    return (
        <div className="relative flex-shrink-0 w-14" style={{ height: 24 * 60 * pxPerMinute }}>
            {HOURS.map(hour => (
                <div 
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-xs text-slate-400"
                    style={{ top: hour * 60 * pxPerMinute }}
                >
                    {formatHour(hour)}
                </div>
            ))}
        </div>
    )
}