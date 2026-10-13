/**
 * A thin bar. "accent" is the app's teal; "category" takes the closest category's colors (a goal's, say)
 */
export function ProgressBar({
    percent,
    label,
    tone = "accent",
}: {
    percent: number
    label: string
    tone?: "accent" | "category"
}) {
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className={`h-1.5 rounded-full overflow-hidden ${tone === "category" ? "bg-cat-tint" : "bg-sunken"}`}
        >
            <div
                className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${tone === "category" ? "bg-cat-solid" : "bg-accent"}`}
                style={{ width: `${percent}%` }}
            />
        </div>
    )
}