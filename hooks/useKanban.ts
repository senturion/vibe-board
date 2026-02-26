'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import { KanbanTask, ColumnId, Priority, LabelId, Subtask } from '@/lib/types'
import { validateTaskTitle, validateTaskDescription } from '@/lib/validation'
import { Database, Json } from '@/lib/supabase/types'
import { haptics } from '@/lib/haptics'

type TaskRow = Database['public']['Tables']['tasks']['Row']

const DEBOUNCE_FIELDS = new Set(['title', 'description'])
const DEBOUNCE_MS = 300

export function useKanban(boardId: string = '') {
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const pendingDbUpdates = useRef<Record<string, { updates: Record<string, unknown>, timer: ReturnType<typeof setTimeout> }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()
  const { settings, loading: settingsLoading } = useSettings()

  // Fetch tasks from Supabase
  useEffect(() => {
    let isActive = true
    const fetchTasks = async () => {
      if (!user) {
        if (isActive) {
          setTasks([])
          setLoading(false)
        }
        return
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .order('order', { ascending: true })

      if (boardId) {
        query = query.eq('board_id', boardId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching tasks:', error)
        if (isActive) {
          setError('Failed to load tasks. Please try refreshing.')
          setLoading(false)
        }
        return
      }

      if (isActive) setError(null)

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
        updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime(),
        completedAt: t.completed_at ? new Date(t.completed_at).getTime() : undefined,
        archivedAt: t.archived_at ? new Date(t.archived_at).getTime() : undefined,
        snoozedUntil: t.snoozed_until ? new Date(t.snoozed_until).getTime() : undefined,
        boardId: t.board_id,
      }))

      if (isActive) {
        setTasks(mappedTasks)
        setLoading(false)
      }
    }

    fetchTasks()
    return () => {
      isActive = false
    }
  }, [user, boardId, supabase])

  useEffect(() => {
    if (!user || settingsLoading) return
    const missingCompletedAt = tasks.filter(task =>
      task.column === 'complete' &&
      !task.completedAt
    )

    if (missingCompletedAt.length === 0) return

    const now = Date.now()
    const ids = missingCompletedAt.map(task => task.id)

    const run = async () => {
      const { error } = await supabase
        .from('tasks')
        .update({ completed_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() })
        .in('id', ids)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error backfilling completed_at:', error.message, error.details, error.code)
        return
      }

      setTasks(prev => prev.map(task =>
        task.column === 'complete' && !task.completedAt
          ? { ...task, completedAt: now, updatedAt: now }
          : task
      ))
    }

    run()
  }, [tasks, user, supabase, settingsLoading])

  useEffect(() => {
    if (!user || settingsLoading) return
    if (!settings.autoArchiveCompleted) return

    const now = Date.now()
    const thresholdMs = settings.archiveAfterDays * 86400000
    const cutoff = now - thresholdMs

    const eligible = tasks.filter(task => {
      if (task.column !== 'complete' || task.archivedAt) return false
      const completionTime = task.completedAt ?? task.updatedAt ?? task.createdAt
      return completionTime <= cutoff
    })

    if (eligible.length === 0) return

    const ids = eligible.map(task => task.id)
    const run = async () => {
      const { error } = await supabase
        .from('tasks')
        .update({ archived_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() })
        .in('id', ids)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error auto-archiving tasks:', error.message, error.details, error.code)
        return
      }

      setTasks(prev => prev.map(task =>
        ids.includes(task.id)
          ? { ...task, archivedAt: now, updatedAt: now }
          : task
      ))
    }

    run()
  }, [tasks, settings, settingsLoading, supabase, user])

  const addTask = useCallback(async (title: string, column: ColumnId = 'todo', priority: Priority = 'medium') => {
    if (!user || !boardId) return ''

    const titleCheck = validateTaskTitle(title)
    if (!titleCheck.valid) return ''

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
      updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : new Date(data.created_at).getTime(),
      boardId: data.board_id,
    }

    setTasks(prev => [...prev, newTask])
    return newTask.id
  }, [user, boardId, supabase])

  const flushDbUpdate = useCallback(async (id: string, dbUpdates: Record<string, unknown>) => {
    dbUpdates.updated_at = new Date().toISOString()
    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
    if (error) {
      console.error('Error updating task:', error)
    }
  }, [supabase])

  const updateTask = useCallback(async (id: string, updates: Partial<KanbanTask>) => {
    if (updates.title !== undefined && !validateTaskTitle(updates.title).valid) return
    if (updates.description !== undefined && !validateTaskDescription(updates.description).valid) return

    const dbUpdates: Record<string, unknown> = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.column !== undefined) dbUpdates.status = updates.column
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.labels !== undefined) dbUpdates.labels = updates.labels
    if (updates.subtasks !== undefined) dbUpdates.subtasks = updates.subtasks
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null
    if (updates.order !== undefined) dbUpdates.order = updates.order
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null
    if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt ? new Date(updates.archivedAt).toISOString() : null
    if (updates.snoozedUntil !== undefined) dbUpdates.snoozed_until = updates.snoozedUntil ? new Date(updates.snoozedUntil).toISOString() : null

    // Optimistic local update
    const updatedAt = Date.now()
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates, updatedAt } : task
    ))

    // Check if all update fields are debounce-eligible (text fields)
    const updateKeys = Object.keys(updates)
    const shouldDebounce = updateKeys.every(key => DEBOUNCE_FIELDS.has(key))

    if (shouldDebounce) {
      // Merge with any pending updates for this task and reset the timer
      const pending = pendingDbUpdates.current[id]
      if (pending) {
        clearTimeout(pending.timer)
        Object.assign(pending.updates, dbUpdates)
      } else {
        pendingDbUpdates.current[id] = { updates: dbUpdates, timer: setTimeout(() => {}, 0) }
        clearTimeout(pendingDbUpdates.current[id].timer)
      }
      pendingDbUpdates.current[id].timer = setTimeout(() => {
        const accumulated = pendingDbUpdates.current[id]?.updates
        delete pendingDbUpdates.current[id]
        if (accumulated) flushDbUpdate(id, accumulated)
      }, DEBOUNCE_MS)
    } else {
      // Flush any pending debounced updates for this task first, then send immediate update
      const pending = pendingDbUpdates.current[id]
      if (pending) {
        clearTimeout(pending.timer)
        Object.assign(pending.updates, dbUpdates)
        delete pendingDbUpdates.current[id]
        flushDbUpdate(id, pending.updates)
      } else {
        flushDbUpdate(id, dbUpdates)
      }
    }
  }, [supabase, flushDbUpdate])

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
    const now = Date.now()
    const archivedAt = new Date(now).toISOString()
    const { error } = await supabase
      .from('tasks')
      .update({ archived_at: archivedAt, updated_at: archivedAt })
      .eq('id', id)

    if (error) {
      console.error('Error archiving task:', error)
      return
    }

    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, archivedAt: now, updatedAt: now } : task
    ))
  }, [supabase])

  const restoreTask = useCallback(async (id: string) => {
    const now = Date.now()
    const { error } = await supabase
      .from('tasks')
      .update({ archived_at: null, updated_at: new Date(now).toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error restoring task:', error)
      return
    }

    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, archivedAt: undefined, updatedAt: now } : task
    ))
  }, [supabase])

  const moveTask = useCallback(async (taskId: string, toColumn: ColumnId, newOrder?: number) => {
    if (!user) return
    const now = Date.now()
    const order = Math.floor(newOrder ?? now)
    const task = tasks.find(t => t.id === taskId)

    // Set completedAt when moving to complete, clear it when moving away
    const completedAt = toColumn === 'complete'
      ? (task?.completedAt || now) // Keep existing completedAt if already set
      : null

    // Haptic feedback when completing a task
    if (toColumn === 'complete' && task?.column !== 'complete') {
      haptics.success()
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        status: toColumn,
        order,
        completed_at: completedAt ? new Date(completedAt).toISOString() : null,
        updated_at: new Date(now).toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error moving task:', error.message, error.details, error.code)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? {
            ...t,
            column: toColumn,
            order,
            completedAt: completedAt || undefined,
            updatedAt: now,
          }
        : t
    ))
  }, [supabase, tasks, user])

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

    const now = Date.now()
    const { error } = await supabase
      .from('tasks')
      .update({ subtasks: newSubtasks as unknown as Json, updated_at: new Date(now).toISOString() })
      .eq('id', taskId)

    if (error) {
      console.error('Error adding subtask:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: newSubtasks, updatedAt: now }
        : t
    ))
  }, [tasks, supabase])

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const newSubtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )

    const now = Date.now()
    const { error } = await supabase
      .from('tasks')
      .update({ subtasks: newSubtasks as unknown as Json, updated_at: new Date(now).toISOString() })
      .eq('id', taskId)

    if (error) {
      console.error('Error toggling subtask:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: newSubtasks, updatedAt: now }
        : t
    ))
  }, [tasks, supabase])

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const newSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId)

    const now = Date.now()
    const { error } = await supabase
      .from('tasks')
      .update({ subtasks: newSubtasks as unknown as Json, updated_at: new Date(now).toISOString() })
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting subtask:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: newSubtasks, updatedAt: now }
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

    const now = Date.now()
    const { error } = await supabase
      .from('tasks')
      .update({ labels: newLabels, updated_at: new Date(now).toISOString() })
      .eq('id', taskId)

    if (error) {
      console.error('Error toggling label:', error)
      return
    }

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, labels: newLabels, updatedAt: now }
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

  // Flush pending debounced updates on unmount
  useEffect(() => {
    return () => {
      for (const [id, pending] of Object.entries(pendingDbUpdates.current)) {
        clearTimeout(pending.timer)
        flushDbUpdate(id, pending.updates)
      }
      pendingDbUpdates.current = {}
    }
  }, [flushDbUpdate])

  return {
    tasks,
    loading,
    error,
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
