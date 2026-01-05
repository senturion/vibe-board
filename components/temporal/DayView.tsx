'use client'

import { ReactNode } from 'react'
import { formatDateKey } from '@/lib/types'

interface DayViewProps<T> {
  date: Date
  items: T[]
  getItemDate: (item: T) => string // returns YYYY-MM-DD
  renderItem: (item: T) => ReactNode
  emptyMessage?: string
  header?: ReactNode
}

export function DayView<T>({
  date,
  items,
  getItemDate,
  renderItem,
  emptyMessage = 'Nothing scheduled for this day',
  header,
}: DayViewProps<T>) {
  const dateKey = formatDateKey(date)
  const dayItems = items.filter(item => getItemDate(item) === dateKey)

  const isToday = dateKey === formatDateKey(new Date())
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex-1 overflow-auto">
      {/* Day header */}
      <div className="sticky top-0 bg-[var(--bg-primary)] z-10 px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
              isToday
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
            }`}
          >
            {date.getDate()}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {isToday ? 'Today' : dayOfWeek}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">{formattedDate}</p>
          </div>
        </div>
        {header}
      </div>

      {/* Items */}
      <div className="p-6">
        {dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayItems.map((item, index) => (
              <div key={index}>{renderItem(item)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
