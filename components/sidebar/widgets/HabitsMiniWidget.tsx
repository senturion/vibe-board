'use client'

import { useMemo } from 'react'
import { Target, Check, ChevronRight } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useNavigation } from '@/contexts/NavigationContext'
import { isHabitActiveToday, formatDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'

export function HabitsMiniWidget() {
  const { habits, completions, toggleHabit, loading } = useHabits()
  const { setActiveView } = useNavigation()

  const todayKey = formatDateKey(new Date())

  const todaysHabits = useMemo(() => {
    return habits.filter(h => isHabitActiveToday(h))
  }, [habits])

  const getIsComplete = (habitId: string) => {
    const todayCompletions = completions.filter(
      c => c.habitId === habitId && c.completionDate === todayKey
    )
    const totalCount = todayCompletions.reduce((sum, c) => sum + c.count, 0)
    const habit = habits.find(h => h.id === habitId)
    return totalCount >= (habit?.targetCount || 1)
  }

  if (loading) {
    return (
      <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading habits...</p>
      </div>
    )
  }

  const completed = todaysHabits.filter(h => getIsComplete(h.id)).length
  const total = todaysHabits.length

  return (
    <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--accent)]" />
          <span className="text-[11px] font-medium text-[var(--text-primary)]">
            Habits
          </span>
        </div>
        <button
          onClick={() => setActiveView('habits')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          title="View all habits"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {total === 0 ? (
        <p className="text-[10px] text-[var(--text-tertiary)]">No habits for today</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {todaysHabits.slice(0, 5).map(habit => {
              const isComplete = getIsComplete(habit.id)
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={cn(
                    'w-full flex items-center gap-2 text-left transition-colors py-0.5',
                    isComplete ? 'opacity-60' : 'opacity-100'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors',
                      isComplete
                        ? 'bg-[var(--success)] border-[var(--success)]'
                        : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                    )}
                  >
                    {isComplete && <Check size={10} className="text-white" />}
                  </div>
                  <span className={cn(
                    'text-[11px] truncate',
                    isComplete ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'
                  )}>
                    {habit.name}
                  </span>
                </button>
              )
            })}
          </div>
          {todaysHabits.length > 5 && (
            <p className="text-[9px] text-[var(--text-tertiary)] mt-1.5">
              +{todaysHabits.length - 5} more
            </p>
          )}
          <p className="text-[10px] text-[var(--text-tertiary)] mt-2 pt-2 border-t border-[var(--border-subtle)]">
            {completed}/{total} complete
          </p>
        </>
      )}
    </div>
  )
}
