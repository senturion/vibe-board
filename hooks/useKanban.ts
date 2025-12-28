'use client'

import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { KanbanTask, ColumnId, Priority, LabelId, Subtask } from '@/lib/types'
import { generateId } from '@/lib/utils'

export function useKanban(boardId: string = 'default') {
  const [allTasks, setTasks] = useLocalStorage<KanbanTask[]>('kanban-tasks', [])

  // Filter tasks by current board
  const tasks = useMemo(() => {
    return allTasks.filter(task => (task.boardId || 'default') === boardId)
  }, [allTasks, boardId])

  const addTask = useCallback((title: string, column: ColumnId = 'todo', priority: Priority = 'medium') => {
    const newTask: KanbanTask = {
      id: generateId(),
      title,
      column,
      priority,
      labels: [],
      subtasks: [],
      order: Date.now(),
      createdAt: Date.now(),
      boardId,
    }
    setTasks(prev => [...prev, newTask])
    return newTask.id
  }, [setTasks, boardId])

  const updateTask = useCallback((id: string, updates: Partial<KanbanTask>) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ))
  }, [setTasks])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
  }, [setTasks])

  const archiveTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, archivedAt: Date.now() } : task
    ))
  }, [setTasks])

  const restoreTask = useCallback((id: string) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, archivedAt: undefined } : task
    ))
  }, [setTasks])

  const moveTask = useCallback((taskId: string, toColumn: ColumnId, newOrder?: number) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, column: toColumn, order: newOrder ?? Date.now() }
        : task
    ))
  }, [setTasks])

  // Subtask operations
  const addSubtask = useCallback((taskId: string, text: string) => {
    const subtask: Subtask = {
      id: generateId(),
      text,
      completed: false,
    }
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, subtasks: [...(task.subtasks || []), subtask] }
        : task
    ))
  }, [setTasks])

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? {
            ...task,
            subtasks: (task.subtasks || []).map(st =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st
            ),
          }
        : task
    ))
  }, [setTasks])

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, subtasks: (task.subtasks || []).filter(st => st.id !== subtaskId) }
        : task
    ))
  }, [setTasks])

  // Label operations
  const toggleLabel = useCallback((taskId: string, labelId: LabelId) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      const labels = task.labels || []
      const hasLabel = labels.includes(labelId)
      return {
        ...task,
        labels: hasLabel
          ? labels.filter(l => l !== labelId)
          : [...labels, labelId],
      }
    }))
  }, [setTasks])

  // Search tasks
  const searchTasks = useCallback((query: string) => {
    if (!query.trim()) return []
    const lowerQuery = query.toLowerCase()
    return tasks
      .filter(task => !task.archivedAt)
      .filter(task =>
        task.title.toLowerCase().includes(lowerQuery) ||
        (task.description?.toLowerCase().includes(lowerQuery)) ||
        (task.subtasks || []).some(st => st.text.toLowerCase().includes(lowerQuery))
      )
  }, [tasks])

  const getTasksByColumn = useCallback((column: ColumnId) => {
    return tasks
      .filter(task => task.column === column && !task.archivedAt)
      .sort((a, b) => a.order - b.order)
  }, [tasks])

  const getArchivedTasks = useCallback(() => {
    return tasks
      .filter(task => task.archivedAt)
      .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))
  }, [tasks])

  const getTaskById = useCallback((id: string) => {
    return tasks.find(task => task.id === id)
  }, [tasks])

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    moveTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    toggleLabel,
    searchTasks,
    getTasksByColumn,
    getArchivedTasks,
    getTaskById,
  }
}
