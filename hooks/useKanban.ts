'use client'

import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { KanbanTask, ColumnId, Priority } from '@/lib/types'
import { generateId } from '@/lib/utils'

export function useKanban() {
  const [tasks, setTasks] = useLocalStorage<KanbanTask[]>('kanban-tasks', [])

  const addTask = useCallback((title: string, column: ColumnId = 'todo', priority: Priority = 'medium') => {
    const newTask: KanbanTask = {
      id: generateId(),
      title,
      column,
      priority,
      order: Date.now(),
      createdAt: Date.now(),
    }
    setTasks(prev => [...prev, newTask])
  }, [setTasks])

  const updateTask = useCallback((id: string, updates: Partial<KanbanTask>) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ))
  }, [setTasks])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id))
  }, [setTasks])

  const moveTask = useCallback((taskId: string, toColumn: ColumnId, newOrder?: number) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, column: toColumn, order: newOrder ?? Date.now() }
        : task
    ))
  }, [setTasks])

  const getTasksByColumn = useCallback((column: ColumnId) => {
    return tasks
      .filter(task => task.column === column)
      .sort((a, b) => a.order - b.order)
  }, [tasks])

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    getTasksByColumn,
  }
}
