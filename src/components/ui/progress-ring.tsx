/**
 * A ring that fills clockwise from the top, with the percent in the middle. For goals measured in numbers;
 * step goals keep the bar, so the two kinds look different at a glance. Colors come from the closest category
 */
export function ProgressRing({ percent, label, size = 56 }: { percent: number; label: string; size?: number }) {
    const clamped = Math.min(Math.max(percent, 0), 100)
    const stroke = size >= 72 ? 7 : 5
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius

    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative flex-shrink-0"
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-cat-tint" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - clamped / 100)}
                    data-testid="ring-value"
                    className="stroke-cat-solid transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
                />
            </svg>
            <span
                aria-hidden="true"
                className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-ink ${
                    size >= 72 ? "text-base" : "text-xs"
                }`}
            >
                {clamped}%
            </span>
        </div>
    )
}
