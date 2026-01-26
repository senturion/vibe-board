'use client'

import { useCallback } from 'react'
import { useKanban } from '@/hooks/useKanban'
import { useUndoRedo } from '@/contexts/UndoRedoContext'
import { COLUMNS, ColumnId, KanbanTask } from '@/lib/types'

export function useUndoRedoKanbanActions(boardId: string = '') {
  const {
    tasks,
    addTask: rawAddTask,
    updateTask: rawUpdateTask,
    deleteTask: rawDeleteTask,
    archiveTask: rawArchiveTask,
    restoreTask: rawRestoreTask,
    moveTask: rawMoveTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    toggleLabel,
    searchTasks,
    getTasksByColumn,
    getArchivedTasks,
    getTaskById,
    loading,
  } = useKanban(boardId)

  const { pushAction } = useUndoRedo()

  // Add task with undo/redo support
  const addTask = useCallback(async (
    title: string,
    column: ColumnId = 'todo',
    priority: KanbanTask['priority'] = 'medium'
  ) => {
    const taskId = await rawAddTask(title, column, priority)
    if (taskId) {
      pushAction({
        type: 'add',
        description: `Added "${title.slice(0, 30)}${title.length > 30 ? '...' : ''}"`,
        undo: () => rawDeleteTask(taskId),
        redo: () => rawAddTask(title, column, priority),
      })
    }
    return taskId
  }, [rawAddTask, rawDeleteTask, pushAction])

  // Delete task with undo/redo support
  const deleteTask = useCallback(async (id: string) => {
    const task = getTaskById(id)
    if (!task) return
    await rawDeleteTask(id)
    pushAction({
      type: 'delete',
      description: `Deleted "${task.title.slice(0, 30)}${task.title.length > 30 ? '...' : ''}"`,
      undo: async () => {
        // Re-add the task with all its properties
        const newId = await rawAddTask(task.title, task.column, task.priority)
        if (newId) {
          if (task.description) await rawUpdateTask(newId, { description: task.description })
          if (task.labels?.length) await rawUpdateTask(newId, { labels: task.labels })
          if (task.dueDate) await rawUpdateTask(newId, { dueDate: task.dueDate })
          if (task.subtasks?.length) await rawUpdateTask(newId, { subtasks: task.subtasks })
          await rawUpdateTask(newId, { order: task.order, createdAt: task.createdAt })
        }
      },
      redo: () => rawDeleteTask(id),
    })
  }, [rawDeleteTask, rawAddTask, rawUpdateTask, getTaskById, pushAction])

  // Update task with undo/redo support
  const updateTask = useCallback(async (id: string, updates: Partial<KanbanTask>) => {
    const task = getTaskById(id)
    if (!task) return
    const previousState = { ...task }
    await rawUpdateTask(id, updates)
    pushAction({
      type: 'update',
      description: `Updated "${task.title.slice(0, 25)}${task.title.length > 25 ? '...' : ''}"`,
      undo: () => rawUpdateTask(id, previousState),
      redo: () => rawUpdateTask(id, updates),
    })
  }, [rawUpdateTask, getTaskById, pushAction])

  // Archive task with undo/redo support
  const archiveTask = useCallback(async (id: string) => {
    const task = getTaskById(id)
    if (!task) return
    await rawArchiveTask(id)
    pushAction({
      type: 'archive',
      description: `Archived "${task.title.slice(0, 25)}${task.title.length > 25 ? '...' : ''}"`,
      undo: () => rawRestoreTask(id),
      redo: () => rawArchiveTask(id),
    })
  }, [rawArchiveTask, rawRestoreTask, getTaskById, pushAction])

  // Restore task with undo/redo support
  const restoreTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    await rawRestoreTask(id)
    pushAction({
      type: 'restore',
      description: `Restored "${task.title.slice(0, 25)}${task.title.length > 25 ? '...' : ''}"`,
      undo: () => rawArchiveTask(id),
      redo: () => rawRestoreTask(id),
    })
  }, [rawRestoreTask, rawArchiveTask, tasks, pushAction])

  // Move task with undo/redo support
  const moveTask = useCallback(async (taskId: string, toColumn: ColumnId, newOrder?: number) => {
    const task = getTaskById(taskId)
    if (!task) return
    const previousColumn = task.column
    const previousOrder = task.order
    await rawMoveTask(taskId, toColumn, newOrder)
    // Only track column changes (not reordering within column)
    if (previousColumn !== toColumn) {
      const toCol = COLUMNS.find(c => c.id === toColumn)?.title
      pushAction({
        type: 'move',
        description: `Moved to ${toCol}`,
        undo: () => rawMoveTask(taskId, previousColumn, previousOrder),
        redo: () => rawMoveTask(taskId, toColumn, newOrder),
      })
    }
  }, [rawMoveTask, getTaskById, pushAction])

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    moveTask,
    // Pass through raw subtask/label operations (no undo needed for these)
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    toggleLabel,
    // Query functions
    searchTasks,
    getTasksByColumn,
    getArchivedTasks,
    getTaskById,
  }
}
