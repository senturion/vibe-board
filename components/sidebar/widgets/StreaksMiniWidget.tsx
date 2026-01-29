'use client'

import { Flame } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'

export function StreaksMiniWidget() {
  const { habits, getStreak } = useHabits()

  // Get active habits with their streaks, sorted by current streak
  // Note: streaks is a Map<string, HabitStreak>
  const habitsWithStreaks = habits
    .filter(h => h.isActive && !h.archivedAt)
    .map(habit => {
      const streak = getStreak(habit.id)
      return {
        habit,
        currentStreak: streak?.currentStreak || 0,
        bestStreak: streak?.bestStreak || 0,
      }
    })
    .filter(h => h.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 4)

  if (habitsWithStreaks.length === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-[10px] text-[var(--text-tertiary)]">No active streaks</p>
        <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Complete habits to start streaks</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {habitsWithStreaks.map(({ habit, currentStreak, bestStreak }) => (
        <div
          key={habit.id}
          className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-tertiary)]"
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ backgroundColor: habit.color + '30' }}
          >
            <Flame size={10} style={{ color: habit.color }} />
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] truncate flex-1">
            {habit.name}
          </span>
          <div className="flex items-center gap-1">
            <Flame size={10} className="text-orange-400" />
            <span className="text-[10px] font-medium text-orange-400">
              {currentStreak}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
