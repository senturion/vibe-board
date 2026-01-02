'use client'

import { useMemo } from 'react'
import {
  HabitCompletion,
  HabitStreak,
  HeatmapEntry,
  HabitStats,
  Habit,
  formatDateKey,
  daysBetween,
} from '@/lib/types'

interface UseHabitAnalyticsProps {
  habit?: Habit
  completions: HabitCompletion[]
  streak?: { current: number; best: number }
  dateRange?: { start: Date; end: Date }
}

export function useHabitAnalytics({
  habit,
  completions,
  streak,
  dateRange,
}: UseHabitAnalyticsProps) {
  // Filter completions to the specific habit and date range
  const filteredCompletions = useMemo(() => {
    let filtered = completions

    if (habit) {
      filtered = filtered.filter(c => c.habitId === habit.id)
    }

    if (dateRange) {
      const startKey = formatDateKey(dateRange.start)
      const endKey = formatDateKey(dateRange.end)
      filtered = filtered.filter(c => c.completionDate >= startKey && c.completionDate <= endKey)
    }

    return filtered
  }, [completions, habit, dateRange])

  // Generate heatmap data for the last 365 days
  const heatmapData = useMemo((): HeatmapEntry[] => {
    const today = new Date()
    const entries: HeatmapEntry[] = []

    // Build a map of date -> count for quick lookup
    const completionMap = new Map<string, number>()
    filteredCompletions.forEach(c => {
      const existing = completionMap.get(c.completionDate) || 0
      completionMap.set(c.completionDate, existing + c.count)
    })

    // Generate entries for the last 365 days
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = formatDateKey(date)
      const count = completionMap.get(dateKey) || 0

      // Calculate intensity level (0-4)
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (count > 0) {
        const targetCount = habit?.targetCount || 1
        const ratio = count / targetCount
        if (ratio >= 2) level = 4
        else if (ratio >= 1.5) level = 3
        else if (ratio >= 1) level = 2
        else level = 1
      }

      entries.push({ date: dateKey, count, level })
    }

    return entries
  }, [filteredCompletions, habit])

  // Generate heatmap data for a specific month
  const getMonthHeatmap = useMemo(() => {
    return (year: number, month: number): HeatmapEntry[] => {
      const entries: HeatmapEntry[] = []
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      // Build completion map
      const completionMap = new Map<string, number>()
      filteredCompletions.forEach(c => {
        const existing = completionMap.get(c.completionDate) || 0
        completionMap.set(c.completionDate, existing + c.count)
      })

      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(new Date(d))
        const count = completionMap.get(dateKey) || 0

        let level: 0 | 1 | 2 | 3 | 4 = 0
        if (count > 0) {
          const targetCount = habit?.targetCount || 1
          const ratio = count / targetCount
          if (ratio >= 2) level = 4
          else if (ratio >= 1.5) level = 3
          else if (ratio >= 1) level = 2
          else level = 1
        }

        entries.push({ date: dateKey, count, level })
      }

      return entries
    }
  }, [filteredCompletions, habit])

  // Calculate completion rate by week
  const completionRateByWeek = useMemo(() => {
    const weeks: { week: string; rate: number; completed: number; total: number }[] = []
    const today = new Date()

    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - (w * 7) - today.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      let completed = 0
      let total = 0

      // Count completions in this week
      for (let d = new Date(weekStart); d <= weekEnd && d <= today; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(new Date(d))
        total++

        const dayCompletions = filteredCompletions.filter(c => c.completionDate === dateKey)
        if (dayCompletions.length > 0) {
          const totalCount = dayCompletions.reduce((sum, c) => sum + c.count, 0)
          if (totalCount >= (habit?.targetCount || 1)) {
            completed++
          }
        }
      }

      const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      weeks.push({
        week: weekLabel,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        completed,
        total,
      })
    }

    return weeks
  }, [filteredCompletions, habit])

  // Calculate overall stats
  const stats = useMemo((): HabitStats => {
    const totalCompletions = filteredCompletions.reduce((sum, c) => sum + c.count, 0)

    // Calculate average per week (last 12 weeks)
    const twelveWeeksAgo = new Date()
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)
    const recentCompletions = filteredCompletions.filter(
      c => c.completionDate >= formatDateKey(twelveWeeksAgo)
    )
    const averagePerWeek = recentCompletions.reduce((sum, c) => sum + c.count, 0) / 12

    // Calculate completion rate (days completed / days tracked)
    const today = new Date()
    const firstCompletionDate = filteredCompletions.length > 0
      ? filteredCompletions.reduce((earliest, c) =>
          c.completionDate < earliest ? c.completionDate : earliest,
          filteredCompletions[0].completionDate
        )
      : formatDateKey(today)

    const daysTracked = daysBetween(new Date(firstCompletionDate), today) + 1
    const uniqueDaysCompleted = new Set(
      filteredCompletions
        .filter(c => c.count >= (habit?.targetCount || 1))
        .map(c => c.completionDate)
    ).size
    const completionRate = daysTracked > 0 ? (uniqueDaysCompleted / daysTracked) * 100 : 0

    return {
      totalCompletions,
      averagePerWeek: Math.round(averagePerWeek * 10) / 10,
      currentStreak: streak?.current || 0,
      bestStreak: streak?.best || 0,
      completionRate: Math.round(completionRate),
    }
  }, [filteredCompletions, streak, habit])

  // Get completion count for a specific date
  const getCompletionCountForDate = useMemo(() => {
    return (date: Date): number => {
      const dateKey = formatDateKey(date)
      return filteredCompletions
        .filter(c => c.completionDate === dateKey)
        .reduce((sum, c) => sum + c.count, 0)
    }
  }, [filteredCompletions])

  // Check if completed on a specific date
  const isCompleted = useMemo(() => {
    return (date: Date): boolean => {
      const count = getCompletionCountForDate(date)
      return count >= (habit?.targetCount || 1)
    }
  }, [getCompletionCountForDate, habit])

  // Get trend (is improvement happening?)
  const trend = useMemo(() => {
    if (completionRateByWeek.length < 4) return 'neutral' as const

    const recent = completionRateByWeek.slice(-4)
    const older = completionRateByWeek.slice(-8, -4)

    const recentAvg = recent.reduce((sum, w) => sum + w.rate, 0) / recent.length
    const olderAvg = older.reduce((sum, w) => sum + w.rate, 0) / older.length

    if (recentAvg > olderAvg + 10) return 'up' as const
    if (recentAvg < olderAvg - 10) return 'down' as const
    return 'neutral' as const
  }, [completionRateByWeek])

  return {
    heatmapData,
    getMonthHeatmap,
    completionRateByWeek,
    stats,
    getCompletionCountForDate,
    isCompleted,
    trend,
  }
}

// Helper hook for all habits analytics (dashboard overview)
export function useAllHabitsAnalytics(habits: Habit[], completions: HabitCompletion[]) {
  const todayKey = formatDateKey(new Date())

  const todayStats = useMemo(() => {
    const activeHabits = habits.filter(h => h.isActive)
    let completed = 0
    let total = activeHabits.length

    activeHabits.forEach(habit => {
      const habitCompletions = completions.filter(
        c => c.habitId === habit.id && c.completionDate === todayKey
      )
      const count = habitCompletions.reduce((sum, c) => sum + c.count, 0)
      if (count >= habit.targetCount) {
        completed++
      }
    })

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [habits, completions, todayKey])

  const weeklyStats = useMemo(() => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)

    let completed = 0
    let total = 0

    for (let d = new Date(weekStart); d <= today; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateKey(new Date(d))
      const activeHabits = habits.filter(h => h.isActive)

      activeHabits.forEach(habit => {
        total++
        const habitCompletions = completions.filter(
          c => c.habitId === habit.id && c.completionDate === dateKey
        )
        const count = habitCompletions.reduce((sum, c) => sum + c.count, 0)
        if (count >= habit.targetCount) {
          completed++
        }
      })
    }

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [habits, completions])

  return {
    todayStats,
    weeklyStats,
  }
}
