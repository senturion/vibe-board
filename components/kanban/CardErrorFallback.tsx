'use client'

import { AlertTriangle, Trash2 } from 'lucide-react'
import { useKanbanActions } from '@/contexts/KanbanActionsContext'

export function CardErrorFallback({ taskId }: { taskId: string }) {
  const { onDeleteTask } = useKanbanActions()

  return (
    <div className="group relative bg-[var(--bg-secondary)] border-l-2 border-red-500/50">
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-red-400">
          <AlertTriangle size={12} />
          <span>Failed to render</span>
        </div>
        <button
          onClick={() => onDeleteTask(taskId)}
          className="opacity-0 group-hover:opacity-100 p-1 -m-1 text-[var(--text-tertiary)] hover:text-red-400 transition-all duration-150"
          title="Delete broken task"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}
