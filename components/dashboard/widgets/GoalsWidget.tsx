'use client'

import { Flag, ChevronRight } from 'lucide-react'
import { useGoals } from '@/hooks/useGoals'
import { useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'

export function GoalsWidget() {
  const { goals, loading } = useGoals()
  const { setActiveView } = useNavigation()

  const activeGoals = goals.filter(g => g.status === 'active')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flag size={14} className="text-[var(--accent)]" />
          <span className="text-[12px] text-[var(--text-secondary)]">
            {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setActiveView('goals')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-auto space-y-2">
        {activeGoals.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] text-center py-4">
            No active goals
          </p>
        ) : (
          activeGoals.slice(0, 4).map(goal => (
            <div
              key={goal.id}
              className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border)]"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-[var(--text-primary)] truncate">
                  {goal.title}
                </span>
                <span className={cn(
                  'text-[10px] font-medium',
                  goal.progress >= 75 ? 'text-[var(--success)]' :
                  goal.progress >= 50 ? 'text-[var(--accent)]' :
                  'text-[var(--text-tertiary)]'
                )}>
                  {Math.round(goal.progress)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all rounded-full',
                    goal.progress >= 75 ? 'bg-[var(--success)]' :
                    goal.progress >= 50 ? 'bg-[var(--accent)]' :
                    'bg-[var(--text-tertiary)]'
                  )}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>

              {goal.targetDate && (
                <p className="text-[9px] text-[var(--text-tertiary)] mt-1">
                  Due {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
