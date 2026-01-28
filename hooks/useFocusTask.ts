'use client'

import { useCallback, useState } from 'react'
import { useUIStateContext } from '@/contexts/UIStateContext'
import { useNavigation } from '@/contexts/NavigationContext'
import { KanbanTask } from '@/lib/types'

interface UseFocusTaskOptions {
  tasks: KanbanTask[]
  moveTask: (taskId: string, column: KanbanTask['column']) => Promise<void>
  linkToTask: (taskId: string) => void
  clearLinks: () => void
  stop: () => Promise<void>
  isRunning: boolean
}

export function useFocusTask({
  tasks,
  moveTask,
  linkToTask,
  clearLinks,
  stop: stopTimer,
  isRunning,
}: UseFocusTaskOptions) {
  const { focusedTaskId, setFocusedTaskId } = useUIStateContext()
  const { setActiveView } = useNavigation()
  const [showStopPrompt, setShowStopPrompt] = useState(false)

  const focusedTask = focusedTaskId
    ? tasks.find(t => t.id === focusedTaskId) || null
    : null

  const focusOnTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Auto-move to in-progress if not already there
    if (task.column !== 'in-progress') {
      await moveTask(taskId, 'in-progress')
    }

    // Set focused task and link timer
    setFocusedTaskId(taskId)
    linkToTask(taskId)

    // Navigate to focus page
    setActiveView('focus')
  }, [tasks, moveTask, setFocusedTaskId, linkToTask, setActiveView])

  const requestStopFocus = useCallback(() => {
    setShowStopPrompt(true)
  }, [])

  const confirmStopFocus = useCallback(async (action: 'complete' | 'in-progress' | 'todo') => {
    if (focusedTaskId) {
      if (action === 'complete') {
        await moveTask(focusedTaskId, 'complete')
      } else if (action === 'todo') {
        await moveTask(focusedTaskId, 'todo')
      }
      // 'in-progress' = no move needed
    }

    // Stop timer if running
    if (isRunning) {
      await stopTimer()
    }

    // Clear focus state
    clearLinks()
    setFocusedTaskId(null)
    setShowStopPrompt(false)
  }, [focusedTaskId, moveTask, isRunning, stopTimer, clearLinks, setFocusedTaskId])

  const cancelStopFocus = useCallback(() => {
    setShowStopPrompt(false)
  }, [])

  return {
    focusedTaskId,
    focusedTask,
    focusOnTask,
    requestStopFocus,
    confirmStopFocus,
    cancelStopFocus,
    showStopPrompt,
  }
}
