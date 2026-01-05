'use client'

import { ReactNode, useMemo } from 'react'
import { formatDateKey, DAYS_OF_WEEK } from '@/lib/types'
import { cn } from '@/lib/utils'

interface WeekViewProps<T> {
  startDate: Date
  items: T[]
  getItemDate: (item: T) => string // returns YYYY-MM-DD
  renderItem: (item: T) => ReactNode
  emptyDayMessage?: string
  onDayClick?: (date: Date) => void
}

export function WeekView<T>({
  startDate,
  items,
  getItemDate,
  renderItem,
  emptyDayMessage,
  onDayClick,
}: WeekViewProps<T>) {
  const todayKey = formatDateKey(new Date())

  // Generate 7 days starting from startDate
  const days = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate)
      day.setDate(day.getDate() + i)
      result.push(day)
    }
    return result
  }, [startDate])

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

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 gap-px bg-[var(--border-subtle)]">
        {days.map((day, index) => {
          const dateKey = formatDateKey(day)
          const isToday = dateKey === todayKey
          const dayItems = itemsByDate[dateKey] || []
          const dayOfWeek = DAYS_OF_WEEK[index]

          return (
            <div
              key={dateKey}
              className={cn(
                'bg-[var(--bg-primary)] min-h-[200px] flex flex-col',
                onDayClick && 'cursor-pointer hover:bg-[var(--bg-secondary)]'
              )}
              onClick={() => onDayClick?.(day)}
            >
              {/* Day header */}
              <div className="p-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    {dayOfWeek.short}
                  </span>
                  <span
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium',
                      isToday
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-primary)]'
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                {dayItems.length === 0 ? (
                  emptyDayMessage && (
                    <p className="text-[10px] text-[var(--text-tertiary)] text-center py-4">
                      {emptyDayMessage}
                    </p>
                  )
                ) : (
                  dayItems.slice(0, 5).map((item, itemIndex) => (
                    <div key={itemIndex} className="text-xs">
                      {renderItem(item)}
                    </div>
                  ))
                )}
                {dayItems.length > 5 && (
                  <p className="text-[10px] text-[var(--text-tertiary)] text-center">
                    +{dayItems.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
