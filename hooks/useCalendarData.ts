'use client'

import { useMemo, useCallback } from 'react'
import { useHabits } from '@/hooks/useHabits'
import { useJournal } from '@/hooks/useJournal'
import { useRoutines } from '@/hooks/useRoutines'
import { CalendarDay, formatDateKey, parseDateKey, isHabitActiveToday, isRoutineActiveToday } from '@/lib/types'

interface UseCalendarDataReturn {
  loading: boolean
  getMonthData: (year: number, month: number) => CalendarDay[]
  getDayData: (date: string) => CalendarDay
}

export function useCalendarData(): UseCalendarDataReturn {
  const { habits, completions, loading: habitsLoading } = useHabits()
  const { entries, loading: journalLoading } = useJournal()
  const { routines, completions: routineCompletions, getRoutineItems, loading: routinesLoading } = useRoutines()

  const loading = habitsLoading || journalLoading || routinesLoading

  // Create a map of completions by date for quick lookup
  const completionsByDate = useMemo(() => {
    const map = new Map<string, Map<string, number>>() // date -> habitId -> count

    completions.forEach(c => {
      if (!map.has(c.completionDate)) {
        map.set(c.completionDate, new Map())
      }
      const dateMap = map.get(c.completionDate)!
      const currentCount = dateMap.get(c.habitId) || 0
      dateMap.set(c.habitId, currentCount + c.count)
    })

    return map
  }, [completions])

  // Create a map of journal entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, { hasMood: boolean; mood?: number }>()
    entries.forEach(e => {
      map.set(e.entryDate, {
        hasMood: e.mood !== undefined && e.mood !== null,
        mood: e.mood,
      })
    })
    return map
  }, [entries])

  // Create a map of routine completions by date
  const routineCompletionsByDate = useMemo(() => {
    const map = new Map<string, Set<string>>() // date -> set of completed item IDs

    routineCompletions.forEach(c => {
      if (!map.has(c.completionDate)) {
        map.set(c.completionDate, new Set())
      }
      map.get(c.completionDate)!.add(c.routineItemId)
    })

    return map
  }, [routineCompletions])

  // Get habits that were active on a specific date
  const getActiveHabitsForDate = useCallback((date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay() // Convert to 1-7 (Mon-Sun)

    return habits.filter(habit => {
      if (!habit.isActive) return false

      switch (habit.frequencyType) {
        case 'daily':
          return true
        case 'specific_days':
          return habit.specificDays?.includes(dayOfWeek as 1|2|3|4|5|6|7) ?? false
        case 'weekly':
          return true
        default:
          return false
      }
    })
  }, [habits])

  // Get routines that were active on a specific date
  const getActiveRoutinesForDate = useCallback((date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay() // Convert to 1-7 (Mon-Sun)

    return routines.filter(routine => {
      return routine.isActive && routine.daysOfWeek.includes(dayOfWeek as 1|2|3|4|5|6|7)
    })
  }, [routines])

  // Get data for a single day
  const getDayData = useCallback((dateKey: string): CalendarDay => {
    const date = parseDateKey(dateKey)

    // Habits
    const activeHabits = getActiveHabitsForDate(date)
    const dateCompletions = completionsByDate.get(dateKey)
    let habitsCompleted = 0

    activeHabits.forEach(habit => {
      const completionCount = dateCompletions?.get(habit.id) || 0
      if (completionCount >= habit.targetCount) {
        habitsCompleted++
      }
    })

    // Journal
    const journalEntry = entriesByDate.get(dateKey)

    // Routines
    const activeRoutines = getActiveRoutinesForDate(date)
    const dateRoutineCompletions = routineCompletionsByDate.get(dateKey)
    let routineItemsCompleted = 0
    let routineItemsTotal = 0

    activeRoutines.forEach(routine => {
      const items = getRoutineItems(routine.id)
      routineItemsTotal += items.length
      items.forEach(item => {
        if (dateRoutineCompletions?.has(item.id)) {
          routineItemsCompleted++
        }
      })
    })

    return {
      date: dateKey,
      habits: {
        total: activeHabits.length,
        completed: habitsCompleted,
      },
      hasJournal: !!journalEntry,
      journalMood: journalEntry?.mood,
      routines: {
        total: routineItemsTotal,
        completed: routineItemsCompleted,
      },
    }
  }, [
    getActiveHabitsForDate,
    getActiveRoutinesForDate,
    completionsByDate,
    entriesByDate,
    routineCompletionsByDate,
    getRoutineItems,
  ])

  // Get data for an entire month
  const getMonthData = useCallback((year: number, month: number): CalendarDay[] => {
    const days: CalendarDay[] = []

    // Get first and last day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Generate data for each day
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateKey = formatDateKey(date)
      days.push(getDayData(dateKey))
    }

    return days
  }, [getDayData])

  return {
    loading,
    getMonthData,
    getDayData,
  }
}
