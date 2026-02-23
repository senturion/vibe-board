'use client'

import { useMemo, useCallback } from 'react'
import { KanbanTask, Board } from '@/lib/types'

const DEFAULT_STALE_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000
const DEFAULT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

interface UseStaleTasks {
  staleTasks: KanbanTask[]
  staleTaskIds: Set<string>
  snoozeTask: (id: string, durationMs?: number) => void
  snoozeAll: (durationMs: number) => void
}

export function useStaleTasks(
  tasks: KanbanTask[],
  boards: Board[],
  updateTask?: (id: string, updates: Partial<KanbanTask>) => void,
): UseStaleTasks {
  const boardThresholdMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const board of boards) {
      if (board.staleDaysThreshold === 0) {
        map.set(board.id, Infinity)
      } else {
        map.set(board.id, (board.staleDaysThreshold ?? DEFAULT_STALE_DAYS) * MS_PER_DAY)
      }
    }
    return map
  }, [boards])

  const staleTasks = useMemo(() => {
    const now = Date.now()
    return tasks
      .filter(task => {
        if (task.column === 'backlog' || task.column === 'complete') return false
        if (task.completedAt || task.archivedAt) return false
        if (task.snoozedUntil && task.snoozedUntil > now) return false

        const thresholdMs = task.boardId
          ? (boardThresholdMap.get(task.boardId) ?? DEFAULT_STALE_DAYS * MS_PER_DAY)
          : DEFAULT_STALE_DAYS * MS_PER_DAY

        if (thresholdMs === Infinity) return false

        const lastTouched = task.updatedAt ?? task.createdAt
        return (now - lastTouched) > thresholdMs
      })
      .sort((a, b) => (a.updatedAt ?? a.createdAt) - (b.updatedAt ?? b.createdAt))
  }, [tasks, boardThresholdMap])

  const staleTaskIds = useMemo(() => new Set(staleTasks.map(t => t.id)), [staleTasks])

  const snoozeTask = useCallback((id: string, durationMs?: number) => {
    if (!updateTask) return
    const snoozedUntil = Date.now() + (durationMs ?? DEFAULT_SNOOZE_MS)
    updateTask(id, { snoozedUntil })
  }, [updateTask])

  const snoozeAll = useCallback((durationMs: number) => {
    if (!updateTask) return
    const snoozedUntil = Date.now() + durationMs
    for (const task of staleTasks) {
      updateTask(task.id, { snoozedUntil })
    }
  }, [updateTask, staleTasks])

  return { staleTasks, staleTaskIds, snoozeTask, snoozeAll }
}
