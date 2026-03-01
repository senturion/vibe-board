import { useMemo } from 'react'
import { Habit, formatDateKey, getWeekStart } from '@/lib/types'

interface MostImprovedHabit {
  habit: Habit
  improvement: number
  recentAvg: number
  prevAvg: number
}

export function useMostImprovedHabits(
  habits: Habit[],
  completionsByDate: Map<string, Map<string, number>>,
  weekStartsOn: 'monday' | 'sunday'
): MostImprovedHabit[] {
  return useMemo(() => {
    const activeHabits = habits.filter(h => h.isActive)
    if (activeHabits.length === 0) return []

    const today = new Date()
    const start = getWeekStart(today, weekStartsOn)
    const weekStarts = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() - (7 * (7 - i)))
      return d
    })

    const getWeeklyRate = (habit: Habit, weekStart: Date) => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      let completed = 0
      let total = 0

      if (habit.frequencyType === 'weekly') {
        const weeklyTarget = Math.max(habit.frequencyValue || 1, 1)
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const dateKey = formatDateKey(new Date(d))
          const count = completionsByDate.get(dateKey)?.get(habit.id) || 0
          if (count >= habit.targetCount) {
            completed++
          }
        }
        total = weeklyTarget
        return total > 0 ? Math.round((Math.min(completed, total) / total) * 100) : 0
      }

      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay()
        if (habit.frequencyType === 'specific_days' && !habit.specificDays?.includes(dayOfWeek as 1|2|3|4|5|6|7)) {
          continue
        }
        total++
        const dateKey = formatDateKey(new Date(d))
        const count = completionsByDate.get(dateKey)?.get(habit.id) || 0
        if (count >= habit.targetCount) {
          completed++
        }
      }

      return total > 0 ? Math.round((completed / total) * 100) : 0
    }

    return activeHabits.map(habit => {
      const rates = weekStarts.map(ws => getWeeklyRate(habit, ws))
      const prev = rates.slice(0, 4)
      const recent = rates.slice(4)
      const prevAvg = prev.reduce((sum, r) => sum + r, 0) / Math.max(prev.length, 1)
      const recentAvg = recent.reduce((sum, r) => sum + r, 0) / Math.max(recent.length, 1)
      const improvement = Math.round(recentAvg - prevAvg)
      return { habit, improvement, recentAvg: Math.round(recentAvg), prevAvg: Math.round(prevAvg) }
    })
      .filter(item => item.improvement > 0)
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 4)
  }, [habits, completionsByDate, weekStartsOn])
}
