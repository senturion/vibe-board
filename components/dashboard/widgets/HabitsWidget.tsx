'use client'

import { useMemo } from 'react'
import { Target, Check, ChevronRight } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useNavigation } from '@/contexts/NavigationContext'
import { isHabitActiveToday, formatDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'

export function HabitsWidget() {
  const { habits, completions, toggleHabit, loading } = useHabits()
  const { setActiveView } = useNavigation()

  const todayKey = formatDateKey(new Date())

  const todaysHabits = useMemo(() => {
    return habits.filter(h => isHabitActiveToday(h))
  }, [habits])

  const getCompletionStatus = (habitId: string) => {
    const todayCompletions = completions.filter(
      c => c.habitId === habitId && c.completionDate === todayKey
    )
    const totalCount = todayCompletions.reduce((sum, c) => sum + c.count, 0)
    const habit = habits.find(h => h.id === habitId)
    const target = habit?.targetCount || 1
    return { count: totalCount, target, isComplete: totalCount >= target }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading...</p>
      </div>
    )
  }

  const completed = todaysHabits.filter(h => getCompletionStatus(h.id).isComplete).length
  const total = todaysHabits.length

  return (
    <div className="flex flex-col h-full">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--accent)]" />
          <span className="text-[12px] text-[var(--text-secondary)]">
            {completed}/{total} complete
          </span>
        </div>
        <button
          onClick={() => setActiveView('habits')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Habits list */}
      <div className="flex-1 overflow-auto space-y-1.5">
        {todaysHabits.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] text-center py-4">
            No habits scheduled for today
          </p>
        ) : (
          todaysHabits.slice(0, 6).map(habit => {
            const status = getCompletionStatus(habit.id)
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors',
                  status.isComplete
                    ? 'bg-[var(--success)]/10 text-[var(--success)]'
                    : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0',
                    status.isComplete
                      ? 'bg-[var(--success)] border-[var(--success)]'
                      : 'border-[var(--border)]'
                  )}
                >
                  {status.isComplete && <Check size={10} className="text-white" />}
                </div>
                <span className="text-[11px] truncate flex-1">{habit.name}</span>
                {habit.targetCount > 1 && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {status.count}/{habit.targetCount}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
