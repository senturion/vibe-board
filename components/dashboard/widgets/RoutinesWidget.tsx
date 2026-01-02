'use client'

import { useMemo } from 'react'
import { ListChecks, Check, ChevronRight } from 'lucide-react'
import { useRoutines } from '@/hooks/useRoutines'
import { useNavigation } from '@/contexts/NavigationContext'
import { isRoutineActiveToday } from '@/lib/types'
import { cn } from '@/lib/utils'

export function RoutinesWidget() {
  const { routines, items: routineItems, toggleItem, getRoutineProgress, loading } = useRoutines()
  const { setActiveView } = useNavigation()

  const todaysRoutines = useMemo(() => {
    return routines.filter(r => isRoutineActiveToday(r))
  }, [routines])

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
          <ListChecks size={14} className="text-[var(--accent)]" />
          <span className="text-[12px] text-[var(--text-secondary)]">
            {todaysRoutines.length} routine{todaysRoutines.length !== 1 ? 's' : ''} today
          </span>
        </div>
        <button
          onClick={() => setActiveView('routines')}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Routines list */}
      <div className="flex-1 overflow-auto space-y-2">
        {todaysRoutines.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] text-center py-4">
            No routines scheduled for today
          </p>
        ) : (
          todaysRoutines.map(routine => {
            const progress = getRoutineProgress(routine.id)
            const items = routineItems.filter(i => i.routineId === routine.id)

            return (
              <div
                key={routine.id}
                className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                    {routine.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {progress.completed}/{progress.total}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                {/* Quick items */}
                <div className="mt-2 space-y-1">
                  {items.slice(0, 3).map(item => {
                    const isCompleted = progress.completedItems.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'w-full flex items-center gap-1.5 text-left py-0.5',
                          isCompleted ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
                        )}
                      >
                        <div
                          className={cn(
                            'w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0',
                            isCompleted
                              ? 'bg-[var(--success)] border-[var(--success)]'
                              : 'border-[var(--border)]'
                          )}
                        >
                          {isCompleted && <Check size={8} className="text-white" />}
                        </div>
                        <span className={cn('text-[10px] truncate', isCompleted && 'line-through')}>
                          {item.title}
                        </span>
                      </button>
                    )
                  })}
                  {items.length > 3 && (
                    <p className="text-[9px] text-[var(--text-tertiary)] pl-4">
                      +{items.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
