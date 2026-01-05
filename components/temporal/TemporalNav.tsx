'use client'

import { ChevronLeft, ChevronRight, List, Calendar, CalendarDays, CalendarRange } from 'lucide-react'
import { SectionViewMode } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TemporalNavProps {
  mode: SectionViewMode
  onModeChange: (mode: SectionViewMode) => void
  dateLabel: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  isToday: boolean
  showListMode?: boolean
}

const MODE_ICONS = {
  list: List,
  day: Calendar,
  week: CalendarRange,
  month: CalendarDays,
}

const MODE_LABELS: Record<SectionViewMode, string> = {
  list: 'List',
  day: 'Day',
  week: 'Week',
  month: 'Month',
}

export function TemporalNav({
  mode,
  onModeChange,
  dateLabel,
  onPrev,
  onNext,
  onToday,
  isToday,
  showListMode = true,
}: TemporalNavProps) {
  const modes: SectionViewMode[] = showListMode ? ['list', 'day', 'week', 'month'] : ['day', 'week', 'month']

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-[var(--border-subtle)]">
      {/* Left: Navigation arrows and date */}
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          <button
            onClick={onPrev}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onNext}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <h2 className="text-lg font-medium text-[var(--text-primary)]">
          {dateLabel}
        </h2>

        {!isToday && mode !== 'list' && (
          <button
            onClick={onToday}
            className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* Right: Mode toggle */}
      <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-tertiary)] rounded-lg">
        {modes.map((m) => {
          const Icon = MODE_ICONS[m]
          const isActive = mode === m

          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                isActive
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              )}
              title={MODE_LABELS[m]}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{MODE_LABELS[m]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
