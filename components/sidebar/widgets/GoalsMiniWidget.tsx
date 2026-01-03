'use client'

import { Flag, ChevronRight } from 'lucide-react'
import { useGoals } from '@/hooks/useGoals'
import { useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'

export function GoalsMiniWidget() {
  const { goals, loading } = useGoals()
  const { setActiveView } = useNavigation()

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3)

  if (loading) {
    return (
      <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading goals...</p>
      </div>
    )
  }

  return (
    <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flag size={14} className="text-[var(--accent)]" />
          <span className="text-[11px] font-medium text-[var(--text-primary)]">
            Goals
          </span>
        </div>
        <button
          onClick={() => setActiveView('goals')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          title="View all goals"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {activeGoals.length === 0 ? (
        <p className="text-[10px] text-[var(--text-tertiary)]">No active goals</p>
      ) : (
        <div className="space-y-2">
          {activeGoals.map(goal => (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--text-secondary)] truncate flex-1 mr-2">
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
              <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
