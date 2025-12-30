'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { KanbanTask, ColumnId, Priority, LabelId, Subtask } from '@/lib/types'
import { Database } from '@/lib/supabase/types'

type TaskRow = Database['public']['Tables']['tasks']['Row']

export function useKanban(boardId: string = '') {
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch tasks from Supabase
  useEffect(() => {
    if (!user || !boardId) {
      setTasks([])
      setLoading(false)
      return
    }

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('order', { ascending: true })

      if (error) {
        console.error('Error fetching tasks:', error)
        setLoading(false)
        return
      }

      const mappedTasks: KanbanTask[] = (data as TaskRow[]).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        column: t.status as ColumnId,
        priority: t.priority as Priority,
        labels: (t.labels || []) as LabelId[],
        subtasks: (t.subtasks as unknown as Subtask[]) || [],
        dueDate: t.due_date ? new Date(t.due_date).getTime() : undefined,
        order: t.order,
        createdAt: new Date(t.created_at).getTime(),
        archivedAt: t.archived_at ? new Date(t.archived_at).getTime() : undefined,
        boardId: t.board_id,
      }))

      setTasks(mappedTasks)
      setLoading(false)
    }

    fetchTasks()
  }, [user, boardId, supabase])

  const addTask = useCallback(async (title: string, column: ColumnId = 'todo', priority: Priority = 'medium') => {
    if (!user || !boardId) return ''

    const order = Date.now()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        board_id: boardId,
        title,
        status: column,
        priority,
        labels: [],
        subtasks: [],
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error.message, error.code, error.details)
      return ''
    }

    const newTask: KanbanTask = {
      id: data.id,
      title: data.title,
      column: data.status as ColumnId,
      priority: data.priority as Priority,
      labels: [],
      subtasks: [],
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
      boardId: data.board_id,
    }

    setTasks(prev => [...prev, newTask])
    return newTask.id
  }, [user, boardId, supabase])

  const updateTask = useCallback(async (id: string, updates: Partial<KanbanTask>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.column !== undefined) dbUpdates.status = updates.column
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.labels !== undefined) dbUpdates.labels = updates.labels
    if (updates.subtasks !== undefined) dbUpdates.subtasks = updates.subtasks
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null
    if (updates.order !== undefined) dbUpdates.order = updates.order
    if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt ? new Date(updates.archivedAt).toISOString() : null

    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('Error updating task:', error)
      return
    }

    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ))
  }, [supabase])

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting task:', error)
      return
    }

    setTasks(prev => prev.filter(task => task.id !== id))
  }, [supabase])

  const archiveTask = useCallback(async (id: string) => {
    const archivedAt = new Date().toISOString()
    const { error } = await supabase
      .from('tasks')
      .update({ archived_at: archivedAt })
      .eq('id', id)

    if (error) {
      console.error('Error archiving task:', error)
      return
    }

    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, archivedAt: Date.now() } : task
    ))
  }, [supabase])

  const restoreTask = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ archived_at: null })
      .eq('id', id)

    if (error) {
      console.error('Error restoring task:', error)
      return
    }

    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, archivedAt: undefined } : task
    ))
  }, [supabase])

  const moveTask = useCallback(async (taskId: string, toColumn: ColumnId, newOrder?: number) => {
    const order = newOrder ?? Date.now()
    const { error } = await supabase
      .from('tasks')
      .update({ status: toColumn, order })
      .eq('id', taskId)

    if (error) {
      console.error('Error moving task:', error)
      return
    }

    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, column: toColumn, order }
        : task
    ))
  }, [supabase])

  // Subtask operations
  const addSubtask = useCallback(async (taskId: string, text: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const subtask: Subtask = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    }
    const newSubtasks = [...(task.subtasks || []), subtask]

    const { error } = await supabase
      .from('tasks')
      .update({ subtasks: newSubtasks })
      .eq('id', taskId)

    if (error) {
      console.error('Error adding subtask:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: newSubtasks }
        : t
    ))
  }, [tasks, supabase])

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const newSubtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )

    const { error } = await supabase
      .from('tasks')
      .update({ subtasks: newSubtasks })
      .eq('id', taskId)

    if (error) {
      console.error('Error toggling subtask:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: newSubtasks }
        : t
    ))
  }, [tasks, supabase])

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const newSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId)

    const { error } = await supabase
      .from('tasks')
      .update({ subtasks: newSubtasks })
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting subtask:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: newSubtasks }
        : t
    ))
  }, [tasks, supabase])

  // Label operations
  const toggleLabel = useCallback(async (taskId: string, labelId: LabelId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const labels = task.labels || []
    const hasLabel = labels.includes(labelId)
    const newLabels = hasLabel
      ? labels.filter(l => l !== labelId)
      : [...labels, labelId]

    const { error } = await supabase
      .from('tasks')
      .update({ labels: newLabels })
      .eq('id', taskId)

    if (error) {
      console.error('Error toggling label:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, labels: newLabels }
        : t
    ))
  }, [tasks, supabase])

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
    loading,
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
