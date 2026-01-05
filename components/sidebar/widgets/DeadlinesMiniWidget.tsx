'use client'

import { Clock, AlertCircle } from 'lucide-react'
import { useKanban } from '@/hooks/useKanban'
import { useGoals } from '@/hooks/useGoals'
import { isOverdue, isDueSoon } from '@/lib/types'

export function DeadlinesMiniWidget() {
  const { tasks } = useKanban()
  const { goals } = useGoals()

  // Get tasks with due dates that are overdue or due soon
  const upcomingTasks = tasks
    .filter(t => t.dueDate && t.column !== 'complete' && !t.archivedAt)
    .filter(t => isOverdue(t.dueDate!) || isDueSoon(t.dueDate!))
    .sort((a, b) => a.dueDate! - b.dueDate!)
    .slice(0, 3)

  // Get goals with target dates that are approaching
  const upcomingGoals = goals
    .filter(g => g.targetDate && g.status === 'active')
    .filter(g => {
      const targetTime = new Date(g.targetDate!).getTime()
      return isOverdue(targetTime) || isDueSoon(targetTime)
    })
    .slice(0, 2)

  const totalItems = upcomingTasks.length + upcomingGoals.length

  if (totalItems === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-[10px] text-[var(--text-tertiary)]">No upcoming deadlines</p>
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (timestamp < today.getTime()) return 'Overdue'
    if (timestamp < tomorrow.getTime()) return 'Today'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-1.5">
      {upcomingTasks.map(task => (
        <div
          key={task.id}
          className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-tertiary)]"
        >
          <Clock size={10} className={isOverdue(task.dueDate!) ? 'text-red-400' : 'text-[var(--accent)]'} />
          <span className="text-[10px] text-[var(--text-secondary)] truncate flex-1">
            {task.title}
          </span>
          <span className={`text-[9px] ${isOverdue(task.dueDate!) ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`}>
            {formatDate(task.dueDate!)}
          </span>
        </div>
      ))}
      {upcomingGoals.map(goal => (
        <div
          key={goal.id}
          className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-tertiary)]"
        >
          <AlertCircle size={10} className="text-[var(--accent)]" />
          <span className="text-[10px] text-[var(--text-secondary)] truncate flex-1">
            {goal.title}
          </span>
          <span className="text-[9px] text-[var(--text-tertiary)]">
            {formatDate(new Date(goal.targetDate!).getTime())}
          </span>
        </div>
      ))}
    </div>
  )
}
