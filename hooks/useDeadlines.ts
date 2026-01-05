'use client'

import { useKanban } from './useKanban'
import { useGoals } from './useGoals'
import { useBoards } from './useBoards'
import { isOverdue, isDueSoon, formatDateKey } from '@/lib/types'

interface Deadline {
  id: string
  title: string
  dueDate: number
  type: 'task' | 'goal' | 'milestone'
  status: 'overdue' | 'today' | 'soon' | 'upcoming'
  priority?: string
  progress?: number
}

export function useDeadlines() {
  const { activeBoardId } = useBoards()
  const { tasks } = useKanban(activeBoardId)
  const { goals, milestones } = useGoals()

  const today = formatDateKey(new Date())
  const deadlines: Deadline[] = []

  // Add tasks with due dates
  tasks.forEach(task => {
    if (task.dueDate && task.column !== 'complete' && !task.archivedAt) {
      const status = getDeadlineStatus(task.dueDate)
      deadlines.push({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        type: 'task',
        status,
        priority: task.priority,
      })
    }
  })

  // Add goals with target dates
  goals.forEach(goal => {
    if (goal.targetDate && goal.status === 'active') {
      const dueDateMs = new Date(goal.targetDate).getTime()
      const status = getDeadlineStatus(dueDateMs)
      deadlines.push({
        id: goal.id,
        title: goal.title,
        dueDate: dueDateMs,
        type: 'goal',
        status,
        priority: goal.priority,
        progress: goal.progress,
      })
    }
  })

  // Add milestones with target dates
  milestones.forEach(milestone => {
    if (milestone.targetDate && !milestone.isCompleted) {
      const dueDateMs = new Date(milestone.targetDate).getTime()
      const status = getDeadlineStatus(dueDateMs)
      deadlines.push({
        id: milestone.id,
        title: milestone.title,
        dueDate: dueDateMs,
        type: 'milestone',
        status,
      })
    }
  })

  // Sort by due date (most urgent first)
  deadlines.sort((a, b) => a.dueDate - b.dueDate)

  function getDeadlineStatus(dueDate: number): Deadline['status'] {
    if (isOverdue(dueDate)) return 'overdue'
    if (formatDateKey(new Date(dueDate)) === today) return 'today'
    if (isDueSoon(dueDate)) return 'soon'
    return 'upcoming'
  }

  const overdueItems = deadlines.filter(d => d.status === 'overdue')
  const todayItems = deadlines.filter(d => d.status === 'today')
  const soonItems = deadlines.filter(d => d.status === 'soon')
  const upcomingItems = deadlines.filter(d => d.status === 'upcoming')

  return {
    deadlines,
    overdueItems,
    todayItems,
    soonItems,
    upcomingItems,
    overdueCount: overdueItems.length,
    todayCount: todayItems.length,
    soonCount: soonItems.length,
    totalCount: deadlines.length,
  }
}
