'use client'

import { AlarmClockOff, BellOff } from 'lucide-react'
import { useKanban } from '@/hooks/useKanban'
import { useBoards } from '@/hooks/useBoards'
import { useStaleTasks } from '@/hooks/useStaleTasks'

function formatRelativeTime(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export function StaleMiniWidget() {
  const { tasks } = useKanban()
  const { boards } = useBoards()
  const { staleTasks, snoozeTask } = useStaleTasks(tasks, boards)

  if (staleTasks.length === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-[10px] text-[var(--text-tertiary)]">All caught up</p>
      </div>
    )
  }

  const displayed = staleTasks.slice(0, 5)
  const boardNameMap = new Map(boards.map(b => [b.id, b.name]))

  return (
    <div className="space-y-1.5">
      {staleTasks.length > 5 && (
        <p className="text-[9px] text-[var(--text-tertiary)] px-1">
          {staleTasks.length} stale tasks total
        </p>
      )}
      {displayed.map(task => (
        <div
          key={task.id}
          className="group flex items-center gap-2 p-1.5 rounded bg-[var(--bg-tertiary)]"
        >
          <AlarmClockOff size={10} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--text-secondary)] truncate">
              {task.title}
            </p>
            <p className="text-[8px] text-[var(--text-tertiary)]">
              {task.boardId ? boardNameMap.get(task.boardId) ?? '' : ''}
              {' \u00b7 '}
              {formatRelativeTime(task.updatedAt ?? task.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={() => snoozeTask(task.id)}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Snooze 7 days"
            >
              <BellOff size={10} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
