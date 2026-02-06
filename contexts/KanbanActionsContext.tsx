'use client'

import { createContext, useContext, useMemo } from 'react'
import { KanbanTask, ColumnId, Priority } from '@/lib/types'

interface KanbanActions {
  onAddTask: (title: string, columnId: ColumnId, priority?: Priority) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<KanbanTask>) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onOpenDetail: (task: KanbanTask) => void
  onFocusTask?: (taskId: string) => void
}

const KanbanActionsContext = createContext<KanbanActions | null>(null)

export function KanbanActionsProvider({
  children,
  onAddTask,
  onDeleteTask,
  onUpdateTask,
  onToggleSubtask,
  onOpenDetail,
  onFocusTask,
}: KanbanActions & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ onAddTask, onDeleteTask, onUpdateTask, onToggleSubtask, onOpenDetail, onFocusTask }),
    [onAddTask, onDeleteTask, onUpdateTask, onToggleSubtask, onOpenDetail, onFocusTask]
  )
  return (
    <KanbanActionsContext.Provider value={value}>
      {children}
    </KanbanActionsContext.Provider>
  )
}

export function useKanbanActions(): KanbanActions {
  const ctx = useContext(KanbanActionsContext)
  if (!ctx) throw new Error('useKanbanActions must be used within KanbanActionsProvider')
  return ctx
}
