export function ProgressBar({ percent, label }: { percent: number; label: string }) {
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 bg-sunken rounded-full overflow-hidden"
        >
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
    )
}