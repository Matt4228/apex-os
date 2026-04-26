"use client"

import { useState } from "react"
import { toggleHabitLog, deleteHabit } from "@/app/actions/habits"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"

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

export default function HabitCard({
  habit,
  onDelete,
  onLogToggle,
}: {
  habit: Habit
  onDelete: (id: string) => void
  onLogToggle: (habitId: string, date: string, action: "added" | "removed") => void
}) {
  const [loading, setLoading] = useState<string | null>(null)

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 0 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const isLoggedOnDay = (date: Date) =>
    habit.logs.some(log => isSameDay(new Date(log.completedOn), date))

  const completedThisWeek = weekDays.filter(isLoggedOnDay).length

  async function handleDayClick(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd")
    setLoading(dateStr)
    const result = await toggleHabitLog(habit.id, dateStr)
    if (result?.action) {
      onLogToggle(habit.id, dateStr, result.action as "added" | "removed")
    }
    setLoading(null)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-900">{habit.title}</h3>
            {habit.category && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {habit.category}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {completedThisWeek} / {habit.targetPerWeek} this week
          </p>
        </div>
        <button
          onClick={() => onDelete(habit.id)}
          className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>

      <div className="flex gap-1.5">
        {weekDays.map(day => {
          const dateStr = format(day, "yyyy-MM-dd")
          const isLogged = isLoggedOnDay(day)
          const isToday = isSameDay(day, today)
          const isFuture = day > today
          const isLoadingDay = loading === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && handleDayClick(day)}
              disabled={isFuture || isLoadingDay}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-md transition-colors border ${
                isFuture
                    ? "border-slate-100 text-slate-300 cursor-not-allowed"
                    : isLogged
                    ? "bg-slate-900 border-slate-900 text-white"
                    : isToday
                    ? "border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-600"
                }`}
            >
              <span className="text-xs font-medium">
                {format(day, "EEE")[0]}
              </span>
              <span className="text-xs">
                {format(day, "d")}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3">
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900 rounded-full transition-all"
            style={{
              width: `${Math.min((completedThisWeek / habit.targetPerWeek) * 100, 100)}%`
            }}
          />
        </div>
      </div>
    </div>
  )
}