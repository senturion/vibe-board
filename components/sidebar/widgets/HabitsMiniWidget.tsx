'use client'

import { useMemo } from 'react'
import { Target, ChevronRight } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useNavigation } from '@/contexts/NavigationContext'
import { Habit, isHabitActiveToday, formatDateKey } from '@/lib/types'
import { dayProgress, habitActionLabel } from '@/lib/habitRing'
import { HabitRing } from '@/components/habits/HabitRing'
import { cn } from '@/lib/utils'

export function HabitsMiniWidget() {
  const { habits, completions, toggleHabit, loading } = useHabits()
  const { setActiveView } = useNavigation()

  const todayKey = formatDateKey(new Date())

  const todaysHabits = useMemo(() => {
    return habits.filter(h => isHabitActiveToday(h))
  }, [habits])

  const getIsComplete = (habit: Habit) => dayProgress(habit, completions, todayKey).isComplete

  if (loading) {
    return (
      <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading habits...</p>
      </div>
    )
  }

  const completed = todaysHabits.filter(h => getIsComplete(h)).length
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
              const { count, target, isComplete } = dayProgress(habit, completions, todayKey)
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => toggleHabit(habit.id)}
                  aria-label={habitActionLabel(habit.name, count, target)}
                  className="w-full flex items-center gap-2 text-left py-0.5"
                >
                  <HabitRing count={count} target={target} size={16} />
                  <span className={cn(
                    'flex-1 text-[11px] truncate',
                    isComplete ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'
                  )}>
                    {habit.name}
                  </span>
                  {target > 1 && (
                    <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                      {Math.min(count, target)}/{target}
                    </span>
                  )}
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
