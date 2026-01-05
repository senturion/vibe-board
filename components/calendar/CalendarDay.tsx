'use client'

import { CalendarDay as CalendarDayType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MoodIcon, getMoodOption } from '@/components/journal/moods'

interface CalendarDayCellProps {
  day: number
  data: CalendarDayType | null
  isToday: boolean
  isCurrentMonth: boolean
  isSelected: boolean
  onClick: () => void
}

export function CalendarDayCell({
  day,
  data,
  isToday,
  isCurrentMonth,
  isSelected,
  onClick,
}: CalendarDayCellProps) {
  // Calculate habit completion percentage for color intensity
  const habitPercentage = data && data.habits.total > 0
    ? Math.round((data.habits.completed / data.habits.total) * 100)
    : 0

  // Calculate routine completion percentage
  const routinePercentage = data && data.routines.total > 0
    ? Math.round((data.routines.completed / data.routines.total) * 100)
    : 0

  // Determine the background color based on habit completion
  const getHabitBg = () => {
    if (!data || data.habits.total === 0) return ''
    if (habitPercentage === 100) return 'bg-green-500/20'
    if (habitPercentage >= 75) return 'bg-green-500/15'
    if (habitPercentage >= 50) return 'bg-green-500/10'
    if (habitPercentage > 0) return 'bg-green-500/5'
    return ''
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'aspect-square p-1 flex flex-col items-center justify-start gap-0.5 border transition-all',
        isCurrentMonth
          ? 'text-[var(--text-primary)]'
          : 'text-[var(--text-tertiary)] opacity-40',
        isToday && 'ring-2 ring-[var(--accent)] ring-inset',
        isSelected
          ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
          : 'border-[var(--border-subtle)] hover:border-[var(--border)]',
        getHabitBg()
      )}
    >
      {/* Day number */}
      <span className={cn(
        'text-sm font-medium',
        isToday && 'text-[var(--accent)]'
      )}>
        {day}
      </span>

      {/* Indicators row */}
      {data && isCurrentMonth && (
        <div className="flex items-center gap-1 mt-auto">
          {/* Habit indicator */}
          {data.habits.total > 0 && (
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                habitPercentage === 100 ? 'bg-green-500' :
                habitPercentage > 0 ? 'bg-green-500/50' :
                'bg-[var(--text-tertiary)]/30'
              )}
              title={`Habits: ${data.habits.completed}/${data.habits.total}`}
            />
          )}

          {/* Journal indicator */}
          {data.hasJournal && (
            <div
              className="w-1.5 h-1.5 rounded-full bg-blue-500"
              title="Journal entry"
            />
          )}

          {/* Routine indicator */}
          {data.routines.total > 0 && (
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                routinePercentage === 100 ? 'bg-orange-500' :
                routinePercentage > 0 ? 'bg-orange-500/50' :
                'bg-[var(--text-tertiary)]/30'
              )}
              title={`Routines: ${data.routines.completed}/${data.routines.total}`}
            />
          )}
        </div>
      )}

      {/* Mood icon (small) */}
      {data?.journalMood && isCurrentMonth && (
        <span title={getMoodOption(data.journalMood)?.label}>
          <MoodIcon mood={data.journalMood} size={12} />
        </span>
      )}
    </button>
  )
}
