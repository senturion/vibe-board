'use client'

import { Clock, AlertTriangle, Calendar, Flag, Target } from 'lucide-react'
import { useDeadlines } from '@/hooks/useDeadlines'
import { cn } from '@/lib/utils'

interface DeadlinesWidgetProps {
  maxItems?: number
}

const STATUS_STYLES = {
  overdue: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  today: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  soon: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  upcoming: {
    bg: 'bg-[var(--bg-tertiary)]',
    text: 'text-[var(--text-secondary)]',
    border: 'border-[var(--border)]',
  },
}

const TYPE_ICONS = {
  task: Clock,
  goal: Flag,
  milestone: Target,
}

export function DeadlinesWidget({ maxItems = 5 }: DeadlinesWidgetProps) {
  const { deadlines, overdueCount, todayCount, soonCount } = useDeadlines()

  const displayItems = deadlines.slice(0, maxItems)

  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
          <Calendar size={20} className="text-[var(--text-tertiary)]" />
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">No upcoming deadlines</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      {(overdueCount > 0 || todayCount > 0 || soonCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 rounded-full">
              <AlertTriangle size={10} />
              {overdueCount} overdue
            </span>
          )}
          {todayCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 rounded-full">
              {todayCount} today
            </span>
          )}
          {soonCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 rounded-full">
              {soonCount} soon
            </span>
          )}
        </div>
      )}

      {/* Deadline items */}
      <div className="space-y-2">
        {displayItems.map(item => {
          const styles = STATUS_STYLES[item.status]
          const Icon = TYPE_ICONS[item.type]
          const date = new Date(item.dueDate)
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })

          return (
            <div
              key={`${item.type}-${item.id}`}
              className={cn(
                'flex items-start gap-2 p-2 rounded border',
                styles.bg,
                styles.border
              )}
            >
              <Icon size={14} className={cn('mt-0.5 shrink-0', styles.text)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-primary)] truncate">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-[10px]', styles.text)}>{dateStr}</span>
                  {item.progress !== undefined && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {item.progress}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {deadlines.length > maxItems && (
        <p className="text-[10px] text-[var(--text-tertiary)] text-center">
          +{deadlines.length - maxItems} more
        </p>
      )}
    </div>
  )
}
