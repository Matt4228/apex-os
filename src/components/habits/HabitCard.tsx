"use client"

import { useState } from "react"
import { Pause, Pencil, Play, X } from "lucide-react"
import { toggleHabitLog } from "@/app/actions/habits"
import { catProps } from "@/lib/categoryColor"
import { formatDateOnly, toDateInputValue, weekRangeOf } from "@/lib/dates"
import { dayStreak, heatmapDays, heatmapLabel } from "@/lib/habitHistory"
import { failureMessage } from "@/lib/optimistic"
import { usePop } from "@/lib/usePop"
import HabitForm, { type HabitFields } from "./HabitForm"

const DAY_MS = 24 * 60 * 60 * 1000

/** The heatmap's rows, top to bottom: its weeks start on Sunday */
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]

type HabitLog = {
  id: string
  completedOn: Date
}

type Habit = {
  id: string
  title: string
  category: string | null
  frequency: string
  targetPerWeek: number
  isActive: boolean
  logs: HabitLog[]
}

const iconButton = "p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-sunken transition-colors"

export default function HabitCard({
  habit,
  onDelete,
  onLogToggle,
  onUpdate = () => {},
  onPauseToggle = () => {},
  today,
}: {
  habit: Habit
  onDelete: (id: string) => void
  onLogToggle: (habitId: string, date: string, action: "added" | "removed") => void
  /** The habit's fields as the server saved them after an edit */
  onUpdate?: (id: string, saved: HabitFields) => void
  /** Pause an active habit, or resume a paused one */
  onPauseToggle?: (id: string) => void
  /** The user's calendar day, "YYYY-MM-DD", from the server, so both sides draw the same week */
  today: string
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pop = usePop()

  // Sunday to Saturday as "YYYY-MM-DD" days, which compare correctly as text
  const { start: weekStart } = weekRangeOf(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => toDateInputValue(new Date(weekStart.getTime() + i * DAY_MS)))

  const isLoggedOnDay = (day: string) => habit.logs.some(log => toDateInputValue(log.completedOn) === day)

  const completedThisWeek = weekDays.filter(isLoggedOnDay).length
  const toGo = habit.targetPerWeek - completedThisWeek
  const paused = !habit.isActive
  const logDays = habit.logs.map(log => toDateInputValue(log.completedOn))
  const streak = habit.frequency === "daily" ? dayStreak(logDays, today) : null

  /** Fill or empty the day on screen now; put it back and explain if the server says no */
  async function handleDayClick(dateStr: string) {
    const action = isLoggedOnDay(dateStr) ? "removed" : "added"
    setError(null)
    setLoading(dateStr)
    onLogToggle(habit.id, dateStr, action)

    const problem = await failureMessage(toggleHabitLog(habit.id, dateStr), "update that habit")
    if (problem) {
      onLogToggle(habit.id, dateStr, action === "added" ? "removed" : "added")
      setError(problem)
    }
    setLoading(null)
  }

  if (editing) {
    return (
      <div className="bg-surface border border-accent rounded-lg p-4">
        <HabitForm
          habit={habit}
          onSaved={saved => {
            onUpdate(habit.id, saved)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    // Everything inside takes the habit's category color: chip, day buttons, bar and heatmap
    <div {...catProps(habit.category)} className={`bg-surface border border-line rounded-lg p-4 ${paused ? "opacity-60" : ""}`}>
      {/* Top row: text, heatmap, buttons. On a phone the heatmap drops to its own line under the other two */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-4 gap-y-3 ${
          paused ? "" : "mb-4"
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-ink">{habit.title}</h3>
            {habit.category && (
              <span className="text-xs font-medium bg-cat-tint text-cat-ink px-2 py-0.5 rounded-full">
                {habit.category}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {paused ? "Paused" : (
              <>
                <span>{`${completedThisWeek} / ${habit.targetPerWeek} this week`}</span>
                {" · "}
                {/* What's left pulls toward the target; hitting it gets a bold finish */}
                {toGo > 0 ? <span>{`${toGo} to go`}</span> : <span className="font-semibold text-cat-ink">Target hit</span>}
              </>
            )}
          </p>
          {!paused && (
            <p className="text-xs text-ink-muted mt-2">
              {streak !== null && (
                <span className="block font-semibold text-cat-ink">
                  {streak} day streak
                </span>
              )}
              Last 12 weeks
            </p>
          )}
        </div>

        {/* Twelve weeks at a glance: a column per week, Sunday on top, this week last. A paused habit hides it */}
        {!paused && (
          <div aria-hidden="true" className="order-last col-span-2 flex gap-1.5 min-w-0 sm:order-none sm:col-span-1">
            {/* Day letters beside the rows, so the grid reads as a calendar. Same row height and gap as the cells */}
            <div data-testid="heatmap-days" className="grid grid-rows-7 gap-[3px] text-[9px] leading-[10px] text-ink-muted">
              {DAY_LETTERS.map((letter, i) => (
                <span key={i} className="h-2.5 w-2 text-center">{letter}</span>
              ))}
            </div>
            <div data-testid="heatmap" className="grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto">
              {heatmapDays(logDays, today).map((logged, i) => (
                <span
                  key={i}
                  title={logged === null ? undefined : heatmapLabel(today, i)}
                  className={`h-2.5 w-2.5 rounded-[3px] ${
                    logged === null ? "" : logged ? "bg-cat-solid" : "bg-cat-tint"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => setEditing(true)} className={iconButton} aria-label={`Edit ${habit.title}`} title="Edit">
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => onPauseToggle(habit.id)}
            className={iconButton}
            aria-label={`${paused ? "Resume" : "Pause"} ${habit.title}`}
            title={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          </button>
          <button
            onClick={() => onDelete(habit.id)}
            className={`${iconButton} hover:text-danger-ink`}
            aria-label={`Delete ${habit.title}`}
            title="Delete"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* A paused habit keeps its history but takes no check-ins */}
      {!paused && (
        <>
          <div className="flex gap-1.5">
            {weekDays.map(day => {
              const isLogged = isLoggedOnDay(day)
              const isToday = day === today
              const isFuture = day > today
              const isLoadingDay = loading === day

              return (
                <button
                  key={day}
                  aria-label={formatDateOnly(day, "EEEE, MMM d")}
                  aria-pressed={isLogged}
                  onClick={() => {
                    if (isFuture) return
                    if (!isLogged) pop.start(day)
                    handleDayClick(day)
                  }}
                  onAnimationEnd={pop.end}
                  disabled={isFuture || isLoadingDay}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-md transition-colors border ${pop.className(day)} ${
                    isFuture
                      ? "border-line text-ink-muted cursor-not-allowed"
                      : isLogged
                      ? "bg-cat-solid border-cat-solid text-cat-on-solid"
                      : isToday
                      ? "border-cat-solid hover:bg-cat-tint text-ink-soft"
                      : "border-cat-line hover:bg-cat-tint text-ink-soft"
                  }`}
                >
                  <span className="text-xs font-medium">
                    {formatDateOnly(day, "EEE")[0]}
                  </span>
                  <span className="text-xs">
                    {formatDateOnly(day, "d")}
                  </span>
                </button>
              )
            })}
          </div>

          {error && <p role="alert" className="text-sm text-danger-ink mt-2">{error}</p>}

          <div className="mt-3">
            <div className="h-1 bg-cat-tint rounded-full overflow-hidden">
              <div
                className="h-full bg-cat-solid rounded-full transition-all"
                style={{
                  width: `${Math.min((completedThisWeek / habit.targetPerWeek) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
