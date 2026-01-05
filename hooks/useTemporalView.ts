'use client'

import { useCallback, useMemo } from 'react'
import { useUIStateContext } from '@/contexts/UIStateContext'
import { TemporalSectionId, SectionViewMode, TemporalViewMode, formatDateKey, parseDateKey } from '@/lib/types'

interface UseTemporalViewResult {
  mode: SectionViewMode
  setMode: (mode: SectionViewMode) => void
  currentDate: Date
  setCurrentDate: (date: Date) => void
  dateKey: string
  goToToday: () => void
  goToPrev: () => void
  goToNext: () => void
  dateRange: { start: Date; end: Date }
  dateLabel: string
  isToday: boolean
  isCurrentMonth: boolean
}

export function useTemporalView(sectionId: TemporalSectionId): UseTemporalViewResult {
  const {
    getSectionViewMode,
    setSectionViewMode,
    getSectionSelectedDate,
    setSectionSelectedDate,
  } = useUIStateContext()

  const mode = getSectionViewMode(sectionId)
  const dateKey = getSectionSelectedDate(sectionId)
  const currentDate = useMemo(() => parseDateKey(dateKey), [dateKey])

  const setMode = useCallback((newMode: SectionViewMode) => {
    setSectionViewMode(sectionId, newMode)
  }, [sectionId, setSectionViewMode])

  const setCurrentDate = useCallback((date: Date) => {
    setSectionSelectedDate(sectionId, formatDateKey(date))
  }, [sectionId, setSectionSelectedDate])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [setCurrentDate])

  const goToPrev = useCallback(() => {
    const newDate = new Date(currentDate)
    if (mode === 'day' || mode === 'list') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else if (mode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }, [currentDate, mode, setCurrentDate])

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate)
    if (mode === 'day' || mode === 'list') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else if (mode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }, [currentDate, mode, setCurrentDate])

  // Calculate date range based on mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (mode === 'day' || mode === 'list') {
      // Single day
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (mode === 'week') {
      // Start of week (Monday)
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
      end.setTime(start.getTime())
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else if (mode === 'month') {
      // Start of month
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0) // Last day of month
      end.setHours(23, 59, 59, 999)
    }

    return { start, end }
  }, [currentDate, mode])

  // Generate date label
  const dateLabel = useMemo(() => {
    if (mode === 'day' || mode === 'list') {
      const today = new Date()
      if (formatDateKey(currentDate) === formatDateKey(today)) {
        return 'Today'
      }
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      if (formatDateKey(currentDate) === formatDateKey(yesterday)) {
        return 'Yesterday'
      }
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (formatDateKey(currentDate) === formatDateKey(tomorrow)) {
        return 'Tomorrow'
      }
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    } else if (mode === 'week') {
      const weekStart = dateRange.start
      const weekEnd = dateRange.end
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`
      }
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else if (mode === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    }
    return ''
  }, [currentDate, mode, dateRange])

  // Check if current date is today
  const isToday = useMemo(() => {
    return formatDateKey(currentDate) === formatDateKey(new Date())
  }, [currentDate])

  // Check if we're viewing the current month
  const isCurrentMonth = useMemo(() => {
    const today = new Date()
    return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()
  }, [currentDate])

  return {
    mode,
    setMode,
    currentDate,
    setCurrentDate,
    dateKey,
    goToToday,
    goToPrev,
    goToNext,
    dateRange,
    dateLabel,
    isToday,
    isCurrentMonth,
  }
}
