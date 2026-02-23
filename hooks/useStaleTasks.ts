'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { KanbanTask, Board } from '@/lib/types'

const SNOOZE_KEY = 'vibe-stale-snooze'
const DEFAULT_STALE_DAYS = 7
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

function loadSnoozeState(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SNOOZE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    // Clean expired snoozes
    const now = Date.now()
    const cleaned: Record<string, number> = {}
    for (const [id, until] of Object.entries(parsed)) {
      if (until > now) cleaned[id] = until
    }
    return cleaned
  } catch {
    return {}
  }
}

function saveSnoozeState(state: Record<string, number>) {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(state))
}

interface UseStaleTasks {
  staleTasks: KanbanTask[]
  staleTaskIds: Set<string>
  snoozeTask: (id: string, durationMs?: number) => void
  snoozeAll: (durationMs: number) => void
}

export function useStaleTasks(tasks: KanbanTask[], boards: Board[]): UseStaleTasks {
  const [snoozeState, setSnoozeState] = useState<Record<string, number>>({})

  useEffect(() => {
    setSnoozeState(loadSnoozeState())
  }, [])

  const boardThresholdMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const board of boards) {
      // 0 means "never" — disable stale detection
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
        if (snoozeState[task.id] && snoozeState[task.id] > now) return false

        const thresholdMs = task.boardId
          ? (boardThresholdMap.get(task.boardId) ?? DEFAULT_STALE_DAYS * MS_PER_DAY)
          : DEFAULT_STALE_DAYS * MS_PER_DAY

        if (thresholdMs === Infinity) return false

        const lastTouched = task.updatedAt ?? task.createdAt
        return (now - lastTouched) > thresholdMs
      })
      .sort((a, b) => (a.updatedAt ?? a.createdAt) - (b.updatedAt ?? b.createdAt))
  }, [tasks, snoozeState, boardThresholdMap])

  const staleTaskIds = useMemo(() => new Set(staleTasks.map(t => t.id)), [staleTasks])

  const snoozeTask = useCallback((id: string, durationMs?: number) => {
    setSnoozeState(prev => {
      const next = { ...prev, [id]: Date.now() + (durationMs ?? SNOOZE_DURATION_MS) }
      saveSnoozeState(next)
      return next
    })
  }, [])

  const snoozeAll = useCallback((durationMs: number) => {
    setSnoozeState(prev => {
      const next = { ...prev }
      const until = Date.now() + durationMs
      for (const task of staleTasks) {
        next[task.id] = until
      }
      saveSnoozeState(next)
      return next
    })
  }, [staleTasks])

  return { staleTasks, staleTaskIds, snoozeTask, snoozeAll }
}
