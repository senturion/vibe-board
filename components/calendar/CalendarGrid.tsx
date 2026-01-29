'use client'

import { useMemo } from 'react'
import { CalendarDay, formatDateKey } from '@/lib/types'
import { CalendarDayCell } from './CalendarDay'

interface CalendarGridProps {
  year: number
  month: number
  monthData: CalendarDay[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  mode?: 'all' | 'habits'
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarGrid({
  year,
  month,
  monthData,
  selectedDate,
  onSelectDate,
  mode = 'all',
}: CalendarGridProps) {
  const today = formatDateKey()

  // Build the calendar grid
  const calendarDays = useMemo(() => {
    const days: { day: number; isCurrentMonth: boolean; dateKey: string }[] = []

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Day of week (0=Sun, 1=Mon, etc.) - convert to Monday-first (0=Mon, 6=Sun)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0)
    const prevMonthDays = prevMonthLastDay.getDate()

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const date = new Date(year, month - 1, day)
      days.push({
        day,
        isCurrentMonth: false,
        dateKey: formatDateKey(date),
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({
        day,
        isCurrentMonth: true,
        dateKey: formatDateKey(date),
      })
    }

    // Next month days (fill to 6 rows = 42 cells)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        day,
        isCurrentMonth: false,
        dateKey: formatDateKey(date),
      })
    }

    return days
  }, [year, month])

  // Create a map for quick lookup of month data
  const dataMap = useMemo(() => {
    const map = new Map<string, CalendarDay>()
    monthData.forEach(d => map.set(d.date, d))
    return map
  }, [monthData])

  return (
    <div className="flex flex-col gap-1">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map(day => (
          <div
            key={day}
            className="text-center py-2 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ day, isCurrentMonth, dateKey }, index) => (
          <CalendarDayCell
            key={index}
            day={day}
            data={dataMap.get(dateKey) || null}
            isToday={dateKey === today}
            isCurrentMonth={isCurrentMonth}
            isSelected={dateKey === selectedDate}
            onClick={() => onSelectDate(dateKey)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-[var(--text-tertiary)]">Habits</span>
        </div>
        {mode === 'all' && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] text-[var(--text-tertiary)]">Journal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[10px] text-[var(--text-tertiary)]">Routines</span>
            </div>
          </>
        )}
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
        Weekly habits only count on days you log them.
      </p>
    </div>
  )
}
