'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { KanbanTask, ColumnId, Priority, LabelId, Subtask, dueDateFromDb, dueDateToDb } from '@/lib/types'
import { validateTaskTitle, validateTaskDescription } from '@/lib/validation'
import { Database, Json } from '@/lib/supabase/types'
import { useSettings } from '@/hooks/useSettings'
import { haptics } from '@/lib/haptics'
import { notifyError } from '@/lib/notify'

type TaskRow = Database['public']['Tables']['tasks']['Row']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

const DEBOUNCE_FIELDS = new Set(['title', 'description'])
const DEBOUNCE_MS = 300

export const tasksQueryKey = (userId: string | undefined) => ['tasks', userId ?? 'signed-out'] as const

// Supabase returns at most 1000 rows per request, so read in pages.
const PAGE_SIZE = 1000

function mapTask(t: TaskRow): KanbanTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description || undefined,
    column: t.status as ColumnId,
    priority: t.priority as Priority,
    labels: (t.labels || []) as LabelId[],
    subtasks: (t.subtasks as unknown as Subtask[]) || [],
    dueDate: dueDateFromDb(t.due_date),
    order: t.order,
    createdAt: new Date(t.created_at).getTime(),
    updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime(),
    completedAt: t.completed_at ? new Date(t.completed_at).getTime() : undefined,
    archivedAt: t.archived_at ? new Date(t.archived_at).getTime() : undefined,
    snoozedUntil: t.snoozed_until ? new Date(t.snoozed_until).getTime() : undefined,
    boardId: t.board_id,
  }
}

const NO_TASKS: KanbanTask[] = []

/**
 * Tasks for one board, or for every board when no boardId is given.
 *
 * All tasks live in one shared cache, loaded once. Every component that calls
 * this hook reads that same copy, so a change made on the board shows up in
 * the sidebar, the stats and the focus view at once. Changes are applied to
 * the cache straight away and undone, with a message, if the save fails.
 */
export function useKanban(boardId: string = '') {
  const pendingDbUpdates = useRef<Record<string, { updates: TaskUpdate, timer: ReturnType<typeof setTimeout> }>>({})
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const userId = user?.id
  const queryKey = useMemo(() => tasksQueryKey(userId), [userId])

  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<KanbanTask[]> => {
      const rows: TaskRow[] = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('order', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
        if (error) throw new Error(error.message)
        rows.push(...((data ?? []) as TaskRow[]))
        if (!data || data.length < PAGE_SIZE) break
      }
      return rows.map(mapTask)
    },
  })

  const allTasks = query.data ?? NO_TASKS
  const tasks = useMemo(
    () => (boardId ? allTasks.filter(task => task.boardId === boardId) : allTasks),
    [allTasks, boardId],
  )
  const loading = !!user && query.isPending
  const error = query.error ? 'Failed to load tasks. Please try refreshing.' : null

  /** The latest tasks, read from the cache so callbacks never act on a stale list. */
  const currentTasks = useCallback(
    () => queryClient.getQueryData<KanbanTask[]>(queryKey) ?? NO_TASKS,
    [queryClient, queryKey],
  )

  const setTasks = useCallback((updater: (tasks: KanbanTask[]) => KanbanTask[]) => {
    queryClient.setQueryData<KanbanTask[]>(queryKey, prev => updater(prev ?? NO_TASKS))
  }, [queryClient, queryKey])

  /**
   * Apply a change to the cache now, then save it. If the save fails, put the
   * task(s) back the way they were, tell the user, and reload from the server.
   */
  const applyAndSave = useCallback(async (
    ids: string[],
    change: (task: KanbanTask) => KanbanTask,
    save: () => PromiseLike<{ error: { message: string } | null }>,
    failureMessage: string,
  ): Promise<boolean> => {
    // A load in flight would overwrite the change with older data.
    await queryClient.cancelQueries({ queryKey })
    const idSet = new Set(ids)
    const before = currentTasks().filter(task => idSet.has(task.id))
    setTasks(prev => prev.map(task => (idSet.has(task.id) ? change(task) : task)))

    const { error } = await save()
    if (!error) return true

    console.error(failureMessage, error.message)
    const original = new Map(before.map(task => [task.id, task]))
    setTasks(prev => prev.map(task => original.get(task.id) ?? task))
    notifyError(failureMessage)
    queryClient.invalidateQueries({ queryKey })
    return false
  }, [queryClient, queryKey, currentTasks, setTasks])

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
      notifyError('Could not add the task. Please try again.')
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
  }, [user, boardId, supabase, setTasks])

  const flushDbUpdate = useCallback(async (id: string, dbUpdates: TaskUpdate) => {
    dbUpdates.updated_at = new Date().toISOString()
    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
    if (error) {
      console.error('Error updating task:', error)
      notifyError('Could not save your change to the task.')
      queryClient.invalidateQueries({ queryKey })
    }
  }, [supabase, queryClient, queryKey])

  const updateTask = useCallback(async (id: string, updates: Partial<KanbanTask>) => {
    if (updates.title !== undefined && !validateTaskTitle(updates.title).valid) return
    if (updates.description !== undefined && !validateTaskDescription(updates.description).valid) return

    const dbUpdates: TaskUpdate = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.column !== undefined) dbUpdates.status = updates.column
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.labels !== undefined) dbUpdates.labels = updates.labels
    if (updates.subtasks !== undefined) dbUpdates.subtasks = updates.subtasks as unknown as Json
    // 'in' rather than !== undefined: clearing a due date passes dueDate: undefined.
    if ('dueDate' in updates) dbUpdates.due_date = dueDateToDb(updates.dueDate)
    if (updates.order !== undefined) dbUpdates.order = updates.order
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null
    if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt ? new Date(updates.archivedAt).toISOString() : null
    if (updates.snoozedUntil !== undefined) dbUpdates.snoozed_until = updates.snoozedUntil ? new Date(updates.snoozedUntil).toISOString() : null

    // Optimistic local update
    await queryClient.cancelQueries({ queryKey })
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
        await flushDbUpdate(id, pending.updates)
      } else {
        await flushDbUpdate(id, dbUpdates)
      }
    }
  }, [flushDbUpdate, queryClient, queryKey, setTasks])

  const deleteTask = useCallback(async (id: string) => {
    await queryClient.cancelQueries({ queryKey })
    const removed = currentTasks().find(task => task.id === id)
    setTasks(prev => prev.filter(task => task.id !== id))

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting task:', error)
      if (removed) setTasks(prev => (prev.some(task => task.id === id) ? prev : [...prev, removed]))
      notifyError('Could not delete the task.')
      queryClient.invalidateQueries({ queryKey })
    }
  }, [supabase, queryClient, queryKey, currentTasks, setTasks])

  const archiveTask = useCallback(async (id: string) => {
    const now = Date.now()
    const archivedAt = new Date(now).toISOString()
    await applyAndSave(
      [id],
      task => ({ ...task, archivedAt: now, updatedAt: now }),
      () => supabase.from('tasks').update({ archived_at: archivedAt, updated_at: archivedAt }).eq('id', id),
      'Could not archive the task.',
    )
  }, [supabase, applyAndSave])

  const restoreTask = useCallback(async (id: string) => {
    const now = Date.now()
    await applyAndSave(
      [id],
      task => ({ ...task, archivedAt: undefined, updatedAt: now }),
      () => supabase.from('tasks').update({ archived_at: null, updated_at: new Date(now).toISOString() }).eq('id', id),
      'Could not restore the task.',
    )
  }, [supabase, applyAndSave])

  const moveTask = useCallback(async (taskId: string, toColumn: ColumnId, newOrder?: number) => {
    if (!user) return
    const now = Date.now()
    const order = Math.floor(newOrder ?? now)
    const task = currentTasks().find(t => t.id === taskId)

    // Set completedAt when moving to complete, clear it when moving away
    const completedAt = toColumn === 'complete'
      ? (task?.completedAt || now) // Keep existing completedAt if already set
      : null

    // Haptic feedback when completing a task
    if (toColumn === 'complete' && task?.column !== 'complete') {
      haptics.success()
    }

    await applyAndSave(
      [taskId],
      t => ({ ...t, column: toColumn, order, completedAt: completedAt || undefined, updatedAt: now }),
      () => supabase
        .from('tasks')
        .update({
          status: toColumn,
          order,
          completed_at: completedAt ? new Date(completedAt).toISOString() : null,
          updated_at: new Date(now).toISOString(),
        })
        .eq('id', taskId)
        .eq('user_id', user.id),
      'Could not move the task.',
    )
  }, [supabase, user, currentTasks, applyAndSave])

  /** Replace a task's subtasks or labels in the cache and in the database. */
  const saveTaskFields = useCallback(async (
    taskId: string,
    fields: { subtasks?: Subtask[]; labels?: LabelId[] },
    failureMessage: string,
  ) => {
    const now = Date.now()
    const dbFields: TaskUpdate = { updated_at: new Date(now).toISOString() }
    if (fields.subtasks) dbFields.subtasks = fields.subtasks as unknown as Json
    if (fields.labels) dbFields.labels = fields.labels
    await applyAndSave(
      [taskId],
      task => ({ ...task, ...fields, updatedAt: now }),
      () => supabase.from('tasks').update(dbFields).eq('id', taskId),
      failureMessage,
    )
  }, [supabase, applyAndSave])

  // Subtask operations
  const addSubtask = useCallback(async (taskId: string, text: string) => {
    const task = currentTasks().find(t => t.id === taskId)
    if (!task) return

    const subtask: Subtask = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    }
    await saveTaskFields(taskId, { subtasks: [...(task.subtasks || []), subtask] }, 'Could not add the subtask.')
  }, [currentTasks, saveTaskFields])

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = currentTasks().find(t => t.id === taskId)
    if (!task) return

    const subtasks = (task.subtasks || []).map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    await saveTaskFields(taskId, { subtasks }, 'Could not update the subtask.')
  }, [currentTasks, saveTaskFields])

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = currentTasks().find(t => t.id === taskId)
    if (!task) return

    const subtasks = (task.subtasks || []).filter(st => st.id !== subtaskId)
    await saveTaskFields(taskId, { subtasks }, 'Could not delete the subtask.')
  }, [currentTasks, saveTaskFields])

  // Label operations
  const toggleLabel = useCallback(async (taskId: string, labelId: LabelId) => {
    const task = currentTasks().find(t => t.id === taskId)
    if (!task) return

    const existing = task.labels || []
    const labels = existing.includes(labelId)
      ? existing.filter(l => l !== labelId)
      : [...existing, labelId]
    await saveTaskFields(taskId, { labels }, 'Could not update the label.')
  }, [currentTasks, saveTaskFields])

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
    const pending = pendingDbUpdates.current
    return () => {
      for (const [id, entry] of Object.entries(pending)) {
        clearTimeout(entry.timer)
        flushDbUpdate(id, entry.updates)
        delete pending[id]
      }
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

/**
 * Upkeep that should happen once per session, not once per component that
 * reads tasks: stamp completed tasks that have no completion time, and
 * archive old completed tasks when that setting is on. Mount it in one place.
 */
export function useTaskHousekeeping() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { settings, loading: settingsLoading } = useSettings()
  const { tasks } = useKanban()
  const userId = user?.id
  const autoArchive = settings.autoArchiveCompleted
  const archiveAfterDays = settings.archiveAfterDays

  useEffect(() => {
    if (!userId || settingsLoading || tasks.length === 0) return

    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const queryKey = tasksQueryKey(userId)
    const patchCache = (ids: string[], patch: Partial<KanbanTask>) => {
      const idSet = new Set(ids)
      queryClient.setQueryData<KanbanTask[]>(queryKey, prev =>
        (prev ?? []).map(task => (idSet.has(task.id) ? { ...task, ...patch, updatedAt: now } : task)),
      )
    }

    const missingCompletedAt = tasks
      .filter(task => task.column === 'complete' && !task.completedAt)
      .map(task => task.id)

    const cutoff = now - archiveAfterDays * 86400000
    const toArchive = autoArchive
      ? tasks
          .filter(task => {
            if (task.column !== 'complete' || task.archivedAt) return false
            const completionTime = task.completedAt ?? task.updatedAt ?? task.createdAt
            return completionTime <= cutoff
          })
          .map(task => task.id)
      : []

    if (missingCompletedAt.length > 0) {
      supabase
        .from('tasks')
        .update({ completed_at: nowIso, updated_at: nowIso })
        .in('id', missingCompletedAt)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.error('Error backfilling completed_at:', error.message)
          else patchCache(missingCompletedAt, { completedAt: now })
        })
    }

    if (toArchive.length > 0) {
      supabase
        .from('tasks')
        .update({ archived_at: nowIso, updated_at: nowIso })
        .in('id', toArchive)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.error('Error auto-archiving tasks:', error.message)
          else patchCache(toArchive, { archivedAt: now })
        })
    }
  }, [tasks, userId, supabase, queryClient, settingsLoading, autoArchive, archiveAfterDays])
}
