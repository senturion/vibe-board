'use client'

import { ReactNode, useMemo } from 'react'
import { formatDateKey, DAYS_OF_WEEK } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MonthViewProps<T> {
  year: number
  month: number // 0-indexed
  items: T[]
  getItemDate: (item: T) => string // returns YYYY-MM-DD
  renderDayContent?: (date: Date, items: T[]) => ReactNode
  onDayClick?: (date: Date) => void
  selectedDate?: Date
}

export function MonthView<T>({
  year,
  month,
  items,
  getItemDate,
  renderDayContent,
  onDayClick,
  selectedDate,
}: MonthViewProps<T>) {
  const todayKey = formatDateKey(new Date())
  const selectedKey = selectedDate ? formatDateKey(selectedDate) : null

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get the day of week for first day (0 = Sunday, adjust to 0 = Monday)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const days: (Date | null)[] = []

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    // Pad to complete the last week
    while (days.length % 7 !== 0) {
      days.push(null)
    }

    return days
  }, [year, month])

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, T[]> = {}
    items.forEach(item => {
      const dateKey = getItemDate(item)
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(item)
    })
    return grouped
  }, [items, getItemDate])

  // Split into weeks
  const weeks = useMemo(() => {
    const result: (Date | null)[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
        {DAYS_OF_WEEK.map(day => (
          <div
            key={day.id}
            className="py-2 text-center text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]"
          >
            {day.short}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 divide-x divide-[var(--border-subtle)]">
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${dayIndex}`}
                    className="min-h-[100px] bg-[var(--bg-tertiary)]/30"
                  />
                )
              }

              const dateKey = formatDateKey(day)
              const isToday = dateKey === todayKey
              const isSelected = dateKey === selectedKey
              const dayItems = itemsByDate[dateKey] || []
              const isCurrentMonth = day.getMonth() === month

              return (
                <div
                  key={dateKey}
                  className={cn(
                    'min-h-[100px] p-2 transition-colors',
                    !isCurrentMonth && 'bg-[var(--bg-tertiary)]/30',
                    onDayClick && 'cursor-pointer hover:bg-[var(--bg-secondary)]',
                    isSelected && 'bg-[var(--accent)]/5 ring-1 ring-inset ring-[var(--accent)]/20'
                  )}
                  onClick={() => onDayClick?.(day)}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-sm',
                        isToday && 'bg-[var(--accent)] text-white font-medium',
                        !isToday && isCurrentMonth && 'text-[var(--text-primary)]',
                        !isToday && !isCurrentMonth && 'text-[var(--text-tertiary)]'
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Day content */}
                  {renderDayContent ? (
                    renderDayContent(day, dayItems)
                  ) : (
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 3).map((item, index) => (
                        <div
                          key={index}
                          className="text-[10px] text-[var(--text-secondary)] truncate"
                        >
                          {String(item)}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          +{dayItems.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
