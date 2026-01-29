'use client'

import { useMemo, useState } from 'react'
import { Check, MoreHorizontal, Edit2, Trash2, Archive, TrendingUp, AlertTriangle } from 'lucide-react'
import { Habit, DAYS_OF_WEEK, getWeekStart, isHabitActiveToday } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/Progress'
import { useSettings } from '@/hooks/useSettings'

interface HabitCardProps {
  habit: Habit
  completionStatus: { completed: boolean; count: number; target: number }
  streak: { current: number; best: number }
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
  onViewStats: () => void
  compact?: boolean
  showRisk?: boolean
}

export function HabitCard({
  habit,
  completionStatus,
  streak,
  onToggle,
  onEdit,
  onDelete,
  onArchive,
  onViewStats,
  compact = false,
  showRisk = false,
}: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const { settings } = useSettings()
  const showWeeklyProgress = habit.frequencyType === 'weekly'
  const showTargetProgress = habit.targetCount > 1 && !showWeeklyProgress
  const weeklyProgress = showWeeklyProgress && completionStatus.target > 0
    ? Math.min(100, (completionStatus.count / completionStatus.target) * 100)
    : 0

  const isAtRisk = useMemo(() => {
    if (!showRisk || streak.current <= 0) return false

    if (showWeeklyProgress) {
      if (completionStatus.completed) return false
      const today = new Date()
      const weekStart = getWeekStart(today, settings.weekStartsOn)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(0, 0, 0, 0)
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const daysLeft = Math.max(0, Math.ceil((weekEnd.getTime() - todayStart.getTime()) / 86400000))
      return daysLeft <= 2
    }

    return isHabitActiveToday(habit) && !completionStatus.completed
  }, [showRisk, streak.current, showWeeklyProgress, completionStatus.completed, habit, settings.weekStartsOn])

  const frequencyLabel = () => {
    switch (habit.frequencyType) {
      case 'daily':
        return 'Daily'
      case 'weekly':
        return `${habit.frequencyValue}x/week`
      case 'specific_days':
        if (habit.specificDays?.length === 5 &&
            habit.specificDays.every(d => d >= 1 && d <= 5)) {
          return 'Weekdays'
        }
        if (habit.specificDays?.length === 2 &&
            habit.specificDays.includes(6) && habit.specificDays.includes(7)) {
          return 'Weekends'
        }
        return habit.specificDays
          ?.map(d => DAYS_OF_WEEK.find(day => day.id === d)?.short)
          .join(', ') || ''
      default:
        return ''
    }
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 border transition-all',
          completionStatus.completed
            ? 'bg-[var(--success)]/5 border-[var(--success)]/20'
            : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
        )}
      >
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            'flex-shrink-0 w-6 h-6 border-2 flex items-center justify-center transition-all',
            completionStatus.completed
              ? 'border-[var(--success)] bg-[var(--success)]'
              : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
          )}
          style={{
            borderColor: completionStatus.completed ? undefined : habit.color,
            backgroundColor: completionStatus.completed ? habit.color : undefined,
          }}
        >
          {completionStatus.completed && <Check size={14} className="text-[var(--bg-primary)]" />}
        </button>

        {/* Name */}
        <span
          className={cn(
            'flex-1 text-[13px] font-medium truncate',
            completionStatus.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'
          )}
        >
          {habit.name}
        </span>

        {showWeeklyProgress && (
          <ProgressRing
            value={weeklyProgress}
            size={18}
            strokeWidth={2}
            color={habit.color}
            backgroundColor="var(--bg-tertiary)"
            showValue={false}
          />
        )}

        {showTargetProgress && (
          <span className="text-[9px] text-[var(--text-tertiary)]">
            {completionStatus.count}/{completionStatus.target}
          </span>
        )}

        {isAtRisk && (
          <AlertTriangle size={12} className="text-amber-400" title="Streak at risk" />
        )}

        {/* Streak */}
        {streak.current > 0 && (
          <StreakBadge count={streak.current} size="sm" />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative group p-4 border transition-all',
        completionStatus.completed
          ? 'bg-[var(--success)]/5 border-[var(--success)]/20'
          : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
      )}
    >
      {/* Color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: habit.color }}
      />

      <div className="flex items-start gap-3 pl-2">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            'flex-shrink-0 w-7 h-7 border-2 flex items-center justify-center transition-all mt-0.5',
            completionStatus.completed
              ? 'bg-[var(--success)]'
              : 'hover:border-[var(--text-tertiary)]'
          )}
          style={{
            borderColor: completionStatus.completed ? 'var(--success)' : habit.color,
            backgroundColor: completionStatus.completed ? habit.color : undefined,
          }}
        >
          {completionStatus.completed && (
            <Check size={16} className="text-[var(--bg-primary)]" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'text-sm font-medium truncate',
                completionStatus.completed
                  ? 'text-[var(--text-tertiary)] line-through'
                  : 'text-[var(--text-primary)]'
              )}
            >
              {habit.name}
            </h3>
            {showWeeklyProgress && (
              <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5">
                {completionStatus.count}/{completionStatus.target} this week
              </span>
            )}
            {showTargetProgress && (
              <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5">
                {completionStatus.count}/{completionStatus.target}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {frequencyLabel()}
            </span>
            {showWeeklyProgress && (
              <ProgressRing
                value={weeklyProgress}
                size={20}
                strokeWidth={2}
                color={habit.color}
                backgroundColor="var(--bg-tertiary)"
                showValue={false}
                className="shrink-0"
              />
            )}
            {isAtRisk && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-amber-400">
                <AlertTriangle size={12} />
                At risk
              </span>
            )}
            {streak.current > 0 && (
              <StreakBadge count={streak.current} size="sm" />
            )}
          </div>

          {habit.description && (
            <p className="text-[12px] text-[var(--text-tertiary)] mt-2 line-clamp-2">
              {habit.description}
            </p>
          )}
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl z-20 min-w-[140px]">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onViewStats()
                  }}
                  className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                >
                  <TrendingUp size={12} />
                  View Stats
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onEdit()
                  }}
                  className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                >
                  <Edit2 size={12} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onArchive()
                  }}
                  className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                >
                  <Archive size={12} />
                  Archive
                </button>
                <div className="h-px bg-[var(--border)]" />
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onDelete()
                  }}
                  className="w-full px-3 py-2 text-left text-[12px] text-red-400 hover:bg-red-400/10 flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
