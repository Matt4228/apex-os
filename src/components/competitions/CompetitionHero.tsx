import type { Metric, Position, Season, WeekProgress } from "@/lib/competition"
import { formatDateOnly } from "@/lib/dates"
import type { Standing } from "@/lib/standings"
import { leftText, standingText } from "./format"
import Podium from "./Podium"

/** The big ring for this week, drawn for the dark hero panel */
function HeroRing({ percent }: { percent: number }) {
    const size = 104
    const r = size / 2 - 7
    const c = 2 * Math.PI * r
    return (
        <div role="img" aria-label={`This week ${Math.round(percent)}%`} className="relative h-[104px] w-[104px] flex-shrink-0">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={9} className="stroke-hero-line" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={9}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - Math.min(percent, 100) / 100)}
                    className="stroke-hero-gold transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
                />
            </svg>
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums">
                {Math.round(percent)}%
            </span>
        </div>
    )
}

/**
 * The top of a competition: its name, where it stands in its weeks, weeks complete, total progress and this
 * week's ring, then what's left to finish this week. Before the start and after the end it says so instead.
 * With rivals, once it has started, the podium takes the ring's place and the last line starts with your standing
 */
export default function CompetitionHero({
    title,
    category,
    weeks,
    startDate,
    endDate,
    position,
    season,
    progress,
    metrics,
    daysLeft,
    standings = [],
}: {
    title: string
    category: string | null
    weeks: number
    startDate: string
    endDate: string
    position: Position
    season: Season
    progress: WeekProgress | null
    metrics: Metric[]
    daysLeft: number | null
    /** Everyone in season order; with two or more the podium shows */
    standings?: Standing[]
}) {
    const withRivals = standings.length >= 2 && position.state !== "upcoming"
    const week = position.state === "active" ? position.week : null
    const chip =
        week !== null
            ? `Week ${week} of ${weeks} · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
            : position.state === "upcoming"
              ? `Starts ${formatDateOnly(startDate, "MMM d")}`
              : `Finished ${formatDateOnly(endDate, "MMM d")}`
    const remaining = progress?.metrics
        .filter(m => m.total < m.target)
        .map(m => {
            const metric = metrics.find(x => x.id === m.metricId)!
            return leftText(m.target - m.total, metric)
        })

    return (
        <section aria-label="Standing" className="relative overflow-hidden rounded-2xl bg-hero p-5 text-hero-ink sm:p-6">
            {/* A faint ring in the corner, for depth */}
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full border-[36px] border-hero-ink/5" />

            <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-hero-soft">Competition{category && ` · ${category}`}</p>
                    <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-balance">{title}</h2>
                </div>
                <span className="whitespace-nowrap rounded-full border border-hero-line bg-hero-ink/10 px-3 py-1 font-mono text-xs">{chip}</span>
            </div>

            <div className="relative mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div>
                    <p className="text-5xl font-extrabold leading-none tracking-tight tabular-nums">
                        {season.completedWeeks}
                        <span className="text-lg font-semibold text-hero-soft"> / {weeks}</span>
                    </p>
                    <p className="mt-1 text-sm text-hero-soft">weeks complete</p>
                </div>
                <div>
                    <p className="text-3xl font-extrabold leading-none tracking-tight tabular-nums">{Math.round(season.totalProgress)}%</p>
                    <p className="mt-1 text-sm text-hero-soft">total progress, the tie-breaker</p>
                </div>
                {withRivals ? (
                    <div className="ml-auto flex w-full justify-center sm:w-auto"><Podium standings={standings} /></div>
                ) : (
                    progress && <div className="ml-auto"><HeroRing percent={progress.percent} /></div>
                )}
            </div>

            <p className="relative mt-5 border-t border-hero-line pt-3 text-sm">
                {withRivals && `${standingText(standings)} `}
                {week === null ? (
                    position.state === "upcoming" ? (
                        <>Starts <b className="text-hero-gold">{formatDateOnly(startDate, "EEEE, MMM d")}</b>. Targets can still change.</>
                    ) : (
                        <>Finished with <b className="text-hero-gold">{season.completedWeeks} of {weeks}</b> weeks complete.</>
                    )
                ) : progress?.complete ? (
                    <><b className="text-hero-gold">Week {week} complete.</b> Everything past here counts toward the tie-breaker.</>
                ) : (
                    <><b className="text-hero-gold">{remaining?.join(" and ")}</b> to finish week {week}</>
                )}
            </p>
        </section>
    )
}
