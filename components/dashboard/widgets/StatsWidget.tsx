'use client'

import { BarChart3, Target, Timer, CheckSquare } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useGoals } from '@/hooks/useGoals'
import { isHabitActiveToday, formatDateKey } from '@/lib/types'

export function StatsWidget() {
  const { habits, completions, loading: habitsLoading } = useHabits()
  const { getTodaysFocusTime, getWeeklyFocusTime, loading: focusLoading } = useFocusTimer()
  const { goals, loading: goalsLoading } = useGoals()

  const loading = habitsLoading || focusLoading || goalsLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading...</p>
      </div>
    )
  }

  // Calculate habit stats
  const todayKey = formatDateKey(new Date())
  const todaysHabits = habits.filter(h => isHabitActiveToday(h))
  const completedHabits = todaysHabits.filter(habit => {
    const todayCompletions = completions.filter(
      c => c.habitId === habit.id && c.completionDate === todayKey
    )
    const totalCount = todayCompletions.reduce((sum, c) => sum + c.count, 0)
    return totalCount >= (habit.targetCount || 1)
  }).length

  // Focus time
  const todaysFocusMinutes = getTodaysFocusTime()
  const weeklyFocusMinutes = getWeeklyFocusTime()

  // Goals stats
  const activeGoals = goals.filter(g => g.status === 'active')
  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {/* Habits */}
      <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <Target size={16} className="text-[var(--accent)] mb-1" />
        <span className="text-lg font-medium text-[var(--text-primary)]">
          {completedHabits}/{todaysHabits.length}
        </span>
        <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          Habits
        </span>
      </div>

      {/* Focus Today */}
      <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <Timer size={16} className="text-[var(--success)] mb-1" />
        <span className="text-lg font-medium text-[var(--text-primary)]">
          {formatTime(todaysFocusMinutes)}
        </span>
        <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          Focus Today
        </span>
      </div>

      {/* Goals Progress */}
      <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <BarChart3 size={16} className="text-[var(--chart-2)] mb-1" />
        <span className="text-lg font-medium text-[var(--text-primary)]">
          {avgProgress}%
        </span>
        <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          Goals Avg
        </span>
      </div>

      {/* Weekly Focus */}
      <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <CheckSquare size={16} className="text-[var(--chart-3)] mb-1" />
        <span className="text-lg font-medium text-[var(--text-primary)]">
          {formatTime(weeklyFocusMinutes)}
        </span>
        <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          This Week
        </span>
      </div>
    </div>
  )
}
