'use client'

import { useMemo } from 'react'
import { X, Target, BookOpen, ListChecks, Check, ChevronRight } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useJournal } from '@/hooks/useJournal'
import { useRoutines } from '@/hooks/useRoutines'
import { useNavigation } from '@/contexts/NavigationContext'
import { CalendarDay, parseDateKey, formatDateKey, MOOD_EMOJIS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DayDetailPanelProps {
  date: string
  data: CalendarDay
  onClose: () => void
}

export function DayDetailPanel({ date, data, onClose }: DayDetailPanelProps) {
  const { habits, completions, toggleHabit } = useHabits()
  const { entries } = useJournal()
  const { routines, getRoutineItems, isItemCompleted, toggleItem } = useRoutines()
  const { setActiveView } = useNavigation()

  const dateObj = parseDateKey(date)
  const isToday = date === formatDateKey()
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay()

  // Format date for display
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Get habits active on this day
  const activeHabits = useMemo(() => {
    return habits.filter(habit => {
      if (!habit.isActive) return false
      switch (habit.frequencyType) {
        case 'daily':
          return true
        case 'specific_days':
          return habit.specificDays?.includes(dayOfWeek as 1|2|3|4|5|6|7) ?? false
        case 'weekly':
          return true
        default:
          return false
      }
    })
  }, [habits, dayOfWeek])

  // Get habit completion status for this day
  const getHabitStatus = (habitId: string) => {
    const habitCompletions = completions.filter(
      c => c.habitId === habitId && c.completionDate === date
    )
    const totalCount = habitCompletions.reduce((sum, c) => sum + c.count, 0)
    const habit = habits.find(h => h.id === habitId)
    const isComplete = totalCount >= (habit?.targetCount || 1)
    return { count: totalCount, target: habit?.targetCount || 1, isComplete }
  }

  // Get journal entry for this day
  const journalEntry = useMemo(() => {
    return entries.find(e => e.entryDate === date)
  }, [entries, date])

  // Get routines active on this day
  const activeRoutines = useMemo(() => {
    return routines.filter(routine => {
      return routine.isActive && routine.daysOfWeek.includes(dayOfWeek as 1|2|3|4|5|6|7)
    })
  }, [routines, dayOfWeek])

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-[var(--bg-elevated)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">{formattedDate}</h3>
          {isToday && (
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">Today</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Habits Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-green-500" />
              <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-medium">
                Habits
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {data.habits.completed}/{data.habits.total}
            </span>
          </div>

          {activeHabits.length === 0 ? (
            <p className="text-[12px] text-[var(--text-tertiary)]">No habits for this day</p>
          ) : (
            <div className="space-y-2">
              {activeHabits.map(habit => {
                const status = getHabitStatus(habit.id)
                return (
                  <button
                    key={habit.id}
                    onClick={() => isToday && toggleHabit(habit.id, dateObj)}
                    disabled={!isToday}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 border transition-colors',
                      status.isComplete
                        ? 'border-green-500/20 bg-green-500/5'
                        : 'border-[var(--border)] hover:border-[var(--text-tertiary)]',
                      !isToday && 'cursor-default'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded-sm border flex items-center justify-center flex-shrink-0',
                        status.isComplete
                          ? 'bg-green-500 border-green-500'
                          : 'border-[var(--border)]'
                      )}
                    >
                      {status.isComplete && <Check size={12} className="text-white" />}
                    </div>
                    <span className={cn(
                      'flex-1 text-left text-[12px]',
                      status.isComplete
                        ? 'text-[var(--text-tertiary)] line-through'
                        : 'text-[var(--text-secondary)]'
                    )}>
                      {habit.name}
                    </span>
                    {habit.targetCount > 1 && (
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {status.count}/{status.target}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Journal Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-blue-500" />
              <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-medium">
                Journal
              </span>
            </div>
            {journalEntry && (
              <button
                onClick={() => setActiveView('journal')}
                className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:underline"
              >
                View <ChevronRight size={10} />
              </button>
            )}
          </div>

          {journalEntry ? (
            <div className="p-3 border border-[var(--border)] bg-[var(--bg-tertiary)]">
              {journalEntry.mood && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {MOOD_EMOJIS.find(m => m.value === journalEntry.mood)?.emoji}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {MOOD_EMOJIS.find(m => m.value === journalEntry.mood)?.label}
                  </span>
                </div>
              )}
              <p className="text-[12px] text-[var(--text-secondary)] line-clamp-4">
                {journalEntry.content || 'No content'}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
                {journalEntry.wordCount} words
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-[var(--text-tertiary)]">No journal entry</p>
          )}
        </div>

        {/* Routines Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks size={14} className="text-orange-500" />
              <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] font-medium">
                Routines
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {data.routines.completed}/{data.routines.total}
            </span>
          </div>

          {activeRoutines.length === 0 ? (
            <p className="text-[12px] text-[var(--text-tertiary)]">No routines for this day</p>
          ) : (
            <div className="space-y-3">
              {activeRoutines.map(routine => {
                const items = getRoutineItems(routine.id)
                const completedCount = items.filter(i => isItemCompleted(i.id)).length

                return (
                  <div key={routine.id} className="border border-[var(--border)]">
                    <div className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)]">
                      <span className="text-[12px] font-medium text-[var(--text-primary)]">
                        {routine.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {completedCount}/{items.length}
                      </span>
                    </div>
                    <div className="p-2 space-y-1">
                      {items.map(item => {
                        const completed = isItemCompleted(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => isToday && toggleItem(item.id)}
                            disabled={!isToday}
                            className={cn(
                              'w-full flex items-center gap-2 py-1 text-left',
                              !isToday && 'cursor-default'
                            )}
                          >
                            <div
                              className={cn(
                                'w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0',
                                completed
                                  ? 'bg-orange-500 border-orange-500'
                                  : 'border-[var(--border)]'
                              )}
                            >
                              {completed && <Check size={10} className="text-white" />}
                            </div>
                            <span className={cn(
                              'text-[11px]',
                              completed
                                ? 'text-[var(--text-tertiary)] line-through'
                                : 'text-[var(--text-secondary)]'
                            )}>
                              {item.title}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
