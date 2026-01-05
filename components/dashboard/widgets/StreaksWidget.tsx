'use client'

import { Flame, TrendingUp, Target } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { cn } from '@/lib/utils'

interface StreaksWidgetProps {
  maxItems?: number
}

export function StreaksWidget({ maxItems = 5 }: StreaksWidgetProps) {
  const { habits, getStreak } = useHabits()

  // Get habits with streaks, sorted by current streak
  const habitsWithStreaks = habits
    .filter(h => h.isActive && !h.archivedAt)
    .map(habit => ({
      habit,
      streak: getStreak(habit.id),
    }))
    .filter(item => item.streak && item.streak.currentStreak > 0)
    .sort((a, b) => (b.streak?.currentStreak || 0) - (a.streak?.currentStreak || 0))
    .slice(0, maxItems)

  const totalStreakDays = habitsWithStreaks.reduce(
    (sum, item) => sum + (item.streak?.currentStreak || 0),
    0
  )

  const longestStreak = habitsWithStreaks.length > 0
    ? Math.max(...habitsWithStreaks.map(item => item.streak?.bestStreak || 0))
    : 0

  if (habitsWithStreaks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
          <Flame size={20} className="text-[var(--text-tertiary)]" />
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">No active streaks</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
          Complete habits to start building streaks
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Flame size={16} className="text-orange-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {totalStreakDays}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Total streak days
            </p>
          </div>
        </div>
        {longestStreak > 0 && (
          <div className="text-right">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {longestStreak}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
              Best ever
            </p>
          </div>
        )}
      </div>

      {/* Individual streaks */}
      <div className="space-y-2">
        {habitsWithStreaks.map(({ habit, streak }) => {
          const currentStreak = streak?.currentStreak || 0
          const bestStreak = streak?.bestStreak || 0
          const isAtBest = currentStreak >= bestStreak && bestStreak > 0

          return (
            <div
              key={habit.id}
              className="flex items-center gap-2 p-2 bg-[var(--bg-tertiary)] rounded"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: habit.color + '20' }}
              >
                <Flame
                  size={12}
                  className={cn(
                    isAtBest ? 'text-orange-400' : 'text-[var(--text-tertiary)]'
                  )}
                  fill={currentStreak >= 7 ? 'currentColor' : 'none'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-primary)] truncate">
                  {habit.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isAtBest ? 'text-orange-400' : 'text-[var(--text-primary)]'
                  )}
                >
                  {currentStreak}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">days</span>
                {isAtBest && (
                  <TrendingUp size={12} className="text-orange-400" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
