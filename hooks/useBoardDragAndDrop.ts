'use client'

import { useCallback, useState, useRef } from 'react'
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import { ColumnId, KanbanTask } from '@/lib/types'
import { haptics } from '@/lib/haptics'

interface UseBoardDragAndDropOptions {
  tasks: KanbanTask[]
  columns: { id: ColumnId }[]
  getTasksByColumn: (column: ColumnId) => KanbanTask[]
  moveTask: (taskId: string, toColumn: ColumnId, newOrder?: number) => Promise<void>
}

export function useBoardDragAndDrop({
  tasks,
  columns,
  getTasksByColumn,
  moveTask,
}: UseBoardDragAndDropOptions) {
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const lastColumnRef = useRef<ColumnId | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
    if (task) {
      lastColumnRef.current = task.column
      haptics.medium()
    }
  }, [tasks])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTaskItem = tasks.find(t => t.id === activeId)
    if (!activeTaskItem) return

    const overColumn = columns.find(c => c.id === overId)
    if (overColumn && activeTaskItem.column !== overColumn.id) {
      if (lastColumnRef.current !== overColumn.id) {
        lastColumnRef.current = overColumn.id
        haptics.selection()
      }
      moveTask(activeId, overColumn.id)
      return
    }

    const overTask = tasks.find(t => t.id === overId)
    if (overTask && activeTaskItem.column !== overTask.column) {
      if (lastColumnRef.current !== overTask.column) {
        lastColumnRef.current = overTask.column
        haptics.selection()
      }
      moveTask(activeId, overTask.column)
    }
  }, [tasks, columns, moveTask])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    lastColumnRef.current = null

    if (!over) return

    // Haptic feedback on drop
    haptics.heavy()

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTaskItem = tasks.find(t => t.id === activeId)
    const overTask = tasks.find(t => t.id === overId)

    if (!activeTaskItem) return

    // Reordering within the same column
    if (overTask && activeTaskItem.column === overTask.column) {
      const columnTasks = getTasksByColumn(activeTaskItem.column)
      const activeIndex = columnTasks.findIndex(t => t.id === activeId)
      const overIndex = columnTasks.findIndex(t => t.id === overId)

      if (activeIndex === -1 || overIndex === -1) return

      let newOrder: number

      // Moving down (to a later position)
      if (activeIndex < overIndex) {
        // Place after the target
        if (overIndex === columnTasks.length - 1) {
          // Moving to the end
          newOrder = columnTasks[overIndex].order + 1
        } else {
          // Place between target and next
          newOrder = (columnTasks[overIndex].order + columnTasks[overIndex + 1].order) / 2
        }
      } else {
        // Moving up (to an earlier position)
        // Place before the target
        if (overIndex === 0) {
          // Moving to the beginning
          newOrder = columnTasks[0].order - 1
        } else {
          // Place between previous and target
          newOrder = (columnTasks[overIndex - 1].order + columnTasks[overIndex].order) / 2
        }
      }

      moveTask(activeId, activeTaskItem.column, newOrder)
    }
  }, [tasks, getTasksByColumn, moveTask])

  return {
    activeTask,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
