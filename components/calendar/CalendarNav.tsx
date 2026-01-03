'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarNavProps {
  year: number
  month: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function CalendarNav({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarNavProps) {
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-[var(--text-primary)]">
          {MONTH_NAMES[month]} {year}
        </h2>
        {!isCurrentMonth && (
          <button
            onClick={onToday}
            className="px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] border border-[var(--accent-muted)] hover:bg-[var(--accent-glow)] transition-colors"
          >
            Today
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevMonth}
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={onNextMonth}
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
