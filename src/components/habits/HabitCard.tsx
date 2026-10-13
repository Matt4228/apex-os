"use client"

import { useState } from "react"
import { Pause, Pencil, Play, X } from "lucide-react"
import { toggleHabitLog } from "@/app/actions/habits"
import { formatDateOnly, toDateInputValue, weekRangeOf } from "@/lib/dates"
import HabitForm, { type HabitFields } from "./HabitForm"

const DAY_MS = 24 * 60 * 60 * 1000

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

  // Sunday to Saturday as "YYYY-MM-DD" days, which compare correctly as text
  const { start: weekStart } = weekRangeOf(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => toDateInputValue(new Date(weekStart.getTime() + i * DAY_MS)))

  const isLoggedOnDay = (day: string) => habit.logs.some(log => toDateInputValue(log.completedOn) === day)

  const completedThisWeek = weekDays.filter(isLoggedOnDay).length
  const paused = !habit.isActive

  async function handleDayClick(dateStr: string) {
    setLoading(dateStr)
    const result = await toggleHabitLog(habit.id, dateStr)
    if (result?.action) {
      onLogToggle(habit.id, dateStr, result.action as "added" | "removed")
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
    <div className={`bg-surface border border-line rounded-lg p-4 ${paused ? "opacity-60" : ""}`}>
      <div className={`flex items-start justify-between gap-3 ${paused ? "" : "mb-4"}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-ink">{habit.title}</h3>
            {habit.category && (
              <span className="text-xs bg-sunken text-ink-soft px-2 py-0.5 rounded-full">
                {habit.category}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {paused ? "Paused" : `${completedThisWeek} / ${habit.targetPerWeek} this week`}
          </p>
        </div>
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
                  onClick={() => !isFuture && handleDayClick(day)}
                  disabled={isFuture || isLoadingDay}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-md transition-colors border ${
                    isFuture
                      ? "border-line text-ink-muted cursor-not-allowed"
                      : isLogged
                      ? "bg-accent border-accent text-white"
                      : isToday
                      ? "border-ink-muted bg-canvas hover:bg-sunken text-ink-soft"
                      : "border-line hover:border-accent hover:bg-canvas text-ink-soft"
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

          <div className="mt-3">
            <div className="h-1 bg-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
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
