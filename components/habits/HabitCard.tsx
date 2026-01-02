'use client'

import { useState } from 'react'
import { Check, MoreHorizontal, Edit2, Trash2, Archive, TrendingUp } from 'lucide-react'
import { Habit, formatDateKey, DAYS_OF_WEEK } from '@/lib/types'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/ui/Badge'

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
}: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false)

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
            {habit.targetCount > 1 && (
              <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5">
                {completionStatus.count}/{habit.targetCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {frequencyLabel()}
            </span>
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
