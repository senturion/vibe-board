'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { KanbanTask, ColumnId, Priority, LabelId, Subtask } from '@/lib/types'

interface DbTask {
  id: string
  user_id: string
  board_id: string
  title: string
  description: string | null
  status: string
  priority: string
  labels: string[]
  subtasks: Subtask[]
  due_date: string | null
  order: number
  created_at: string
  archived_at: string | null
}

export function useSupabaseKanban(boardId: string | null) {
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  // Fetch tasks when board changes
  useEffect(() => {
    if (!user || !boardId) {
      setLoading(false)
      return
    }

    const fetchTasks = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('order', { ascending: true })

      if (!error && data) {
        const mappedTasks: KanbanTask[] = (data as DbTask[]).map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          column: t.status as ColumnId,
          priority: t.priority as Priority,
          labels: (t.labels || []) as LabelId[],
          subtasks: (t.subtasks || []) as Subtask[],
          dueDate: t.due_date ? new Date(t.due_date).getTime() : undefined,
          order: t.order,
          createdAt: new Date(t.created_at).getTime(),
          archivedAt: t.archived_at ? new Date(t.archived_at).getTime() : undefined,
          boardId: t.board_id,
        }))
        setTasks(mappedTasks)
      }
      setLoading(false)
    }

    fetchTasks()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`tasks-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, boardId, supabase])

  const addTask = useCallback(async (
    title: string,
    column: ColumnId = 'todo',
    priority: Priority = 'medium'
  ): Promise<string> => {
    if (!user || !boardId) return ''

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
        order: Date.now(),
      })
      .select()
      .single()

    if (!error && data) {
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
      return data.id
    }
    return ''
  }, [user, boardId, supabase])

  const updateTask = useCallback(async (id: string, updates: Partial<KanbanTask>) => {
    const dbUpdates: Record<string, unknown> = {}

    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.column !== undefined) dbUpdates.status = updates.column
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.labels !== undefined) dbUpdates.labels = updates.labels
    if (updates.subtasks !== undefined) dbUpdates.subtasks = updates.subtasks
    if (updates.dueDate !== undefined) {
      dbUpdates.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null
    }
    if (updates.order !== undefined) dbUpdates.order = updates.order
    if (updates.archivedAt !== undefined) {
      dbUpdates.archived_at = updates.archivedAt ? new Date(updates.archivedAt).toISOString() : null
    }

    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)

    if (!error) {
      setTasks(prev => prev.map(task =>
        task.id === id ? { ...task, ...updates } : task
      ))
    }
  }, [supabase])

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (!error) {
      setTasks(prev => prev.filter(task => task.id !== id))
    }
  }, [supabase])

  const archiveTask = useCallback(async (id: string) => {
    await updateTask(id, { archivedAt: Date.now() })
  }, [updateTask])

  const restoreTask = useCallback(async (id: string) => {
    await updateTask(id, { archivedAt: undefined })
  }, [updateTask])

  const moveTask = useCallback(async (taskId: string, toColumn: ColumnId, newOrder?: number) => {
    await updateTask(taskId, { column: toColumn, order: newOrder ?? Date.now() })
  }, [updateTask])

  const addSubtask = useCallback(async (taskId: string, text: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const subtask: Subtask = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    }
    const newSubtasks = [...(task.subtasks || []), subtask]
    await updateTask(taskId, { subtasks: newSubtasks })
  }, [tasks, updateTask])

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const newSubtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    await updateTask(taskId, { subtasks: newSubtasks })
  }, [tasks, updateTask])

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const newSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId)
    await updateTask(taskId, { subtasks: newSubtasks })
  }, [tasks, updateTask])

  const toggleLabel = useCallback(async (taskId: string, labelId: LabelId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const labels = task.labels || []
    const hasLabel = labels.includes(labelId)
    const newLabels = hasLabel
      ? labels.filter(l => l !== labelId)
      : [...labels, labelId]
    await updateTask(taskId, { labels: newLabels })
  }, [tasks, updateTask])

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
