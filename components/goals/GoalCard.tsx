'use client'

import { useState } from 'react'
import { Check, MoreHorizontal, Edit2, Trash2, Archive, Flag, Calendar, Target } from 'lucide-react'
import { Goal, Milestone, GOAL_STATUSES } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'

interface GoalCardProps {
  goal: Goal
  milestones: Milestone[]
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
  onComplete: () => void
  onToggleMilestone: (id: string) => void
  onClick?: () => void
  compact?: boolean
}

export function GoalCard({
  goal,
  milestones,
  onEdit,
  onDelete,
  onArchive,
  onComplete,
  onToggleMilestone,
  onClick,
  compact = false,
}: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const statusInfo = GOAL_STATUSES.find(s => s.id === goal.status)
  const completedMilestones = milestones.filter(m => m.isCompleted).length
  const totalMilestones = milestones.length

  const getDaysRemaining = () => {
    if (!goal.targetDate) return null
    const target = new Date(goal.targetDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const daysRemaining = getDaysRemaining()

  const priorityColors = {
    low: 'var(--text-tertiary)',
    medium: 'var(--text-secondary)',
    high: 'var(--accent)',
  }

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 p-3 border transition-all cursor-pointer',
          goal.status === 'completed'
            ? 'bg-[var(--success)]/5 border-[var(--success)]/20'
            : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
        )}
      >
        <div
          className="w-8 h-8 flex items-center justify-center border"
          style={{ borderColor: priorityColors[goal.priority] }}
        >
          <Flag size={14} style={{ color: priorityColors[goal.priority] }} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'text-[13px] font-medium truncate',
            goal.status === 'completed' && 'text-[var(--text-tertiary)] line-through'
          )}>
            {goal.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <ProgressBar value={goal.progress} size="sm" color="success" className="w-16" />
            <span className="text-[10px] text-[var(--text-tertiary)]">{goal.progress}%</span>
          </div>
        </div>

        {daysRemaining !== null && daysRemaining >= 0 && goal.status === 'active' && (
          <span className={cn(
            'text-[10px] px-2 py-1 border',
            daysRemaining <= 7 ? 'text-[var(--accent)] border-[var(--accent-muted)]' : 'text-[var(--text-tertiary)] border-[var(--border)]'
          )}>
            {daysRemaining}d left
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative group border transition-all',
        goal.status === 'completed'
          ? 'bg-[var(--success)]/5 border-[var(--success)]/20'
          : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
      )}
    >
      {/* Priority indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: priorityColors[goal.priority] }}
      />

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                'text-sm font-medium',
                goal.status === 'completed' && 'text-[var(--text-tertiary)] line-through'
              )}>
                {goal.title}
              </h3>
              <Badge variant={goal.status === 'completed' ? 'success' : goal.status === 'paused' ? 'muted' : 'accent'}>
                {statusInfo?.label}
              </Badge>
            </div>

            {goal.description && (
              <p className="text-[12px] text-[var(--text-tertiary)] line-clamp-2 mb-3">
                {goal.description}
              </p>
            )}

            {/* Progress */}
            <div className="flex items-center gap-3 mb-3">
              <ProgressBar value={goal.progress} size="md" color="success" className="flex-1" />
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                {goal.progress}%
              </span>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-[11px] text-[var(--text-tertiary)]">
              {goal.targetDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {daysRemaining !== null && daysRemaining >= 0 && (
                    <span className={daysRemaining <= 7 ? 'text-[var(--accent)]' : ''}>
                      ({daysRemaining}d)
                    </span>
                  )}
                </span>
              )}
              {totalMilestones > 0 && (
                <span className="flex items-center gap-1">
                  <Target size={12} />
                  {completedMilestones}/{totalMilestones} milestones
                </span>
              )}
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl z-20 min-w-[140px]">
                  {goal.status === 'active' && (
                    <button
                      onClick={() => { setShowMenu(false); onComplete(); }}
                      className="w-full px-3 py-2 text-left text-[12px] text-[var(--success)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                    >
                      <Check size={12} />
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); onEdit(); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onArchive(); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                  <div className="h-px bg-[var(--border)]" />
                  <button
                    onClick={() => { setShowMenu(false); onDelete(); }}
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

        {/* Milestones (expandable) */}
        {totalMilestones > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {expanded ? 'Hide' : 'Show'} Milestones
            </button>

            {expanded && (
              <div className="mt-2 space-y-1">
                {milestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className="flex items-center gap-2 py-1"
                  >
                    <button
                      onClick={() => onToggleMilestone(milestone.id)}
                      className={cn(
                        'w-4 h-4 border flex items-center justify-center transition-colors',
                        milestone.isCompleted
                          ? 'bg-[var(--success)] border-[var(--success)]'
                          : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                      )}
                    >
                      {milestone.isCompleted && <Check size={10} className="text-[var(--bg-primary)]" />}
                    </button>
                    <span className={cn(
                      'text-[12px]',
                      milestone.isCompleted ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-secondary)]'
                    )}>
                      {milestone.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
