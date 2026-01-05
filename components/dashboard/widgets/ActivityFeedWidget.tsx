'use client'

import { useMemo } from 'react'
import { Activity, CheckCircle, Target, BookOpen, Timer, Flag, ListChecks, CheckSquare } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useJournal } from '@/hooks/useJournal'
import { useGoals } from '@/hooks/useGoals'
import { useKanban } from '@/hooks/useKanban'
import { formatDateKey } from '@/lib/types'

interface ActivityItem {
  id: string
  type: 'habit' | 'journal' | 'goal' | 'milestone' | 'routine' | 'task'
  title: string
  description?: string
  timestamp: number
  icon: typeof Activity
  color: string
}

interface ActivityFeedWidgetProps {
  maxItems?: number
}

export function ActivityFeedWidget({ maxItems = 10 }: ActivityFeedWidgetProps) {
  const { completions, habits } = useHabits()
  const { entries } = useJournal()
  const { goals, milestones } = useGoals()
  const { tasks } = useKanban()

  const activities = useMemo(() => {
    const items: ActivityItem[] = []
    const now = new Date()
    const today = formatDateKey(now)
    const yesterday = formatDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const twoDaysAgo = now.getTime() - 2 * 24 * 60 * 60 * 1000

    // Add habit completions from today and yesterday
    completions
      .filter(c => c.completionDate === today || c.completionDate === yesterday)
      .forEach(completion => {
        const habit = habits.find(h => h.id === completion.habitId)
        if (habit) {
          items.push({
            id: `habit-${completion.id}`,
            type: 'habit',
            title: habit.name,
            description: completion.count > 1 ? `Completed ${completion.count} times` : 'Completed',
            timestamp: completion.completedAt,
            icon: Target,
            color: habit.color,
          })
        }
      })

    // Add recent journal entries
    entries
      .filter(e => e.entryDate === today || e.entryDate === yesterday)
      .forEach(entry => {
        items.push({
          id: `journal-${entry.id}`,
          type: 'journal',
          title: 'Journal Entry',
          description: entry.content.slice(0, 50) + (entry.content.length > 50 ? '...' : ''),
          timestamp: entry.updatedAt,
          icon: BookOpen,
          color: '#81b29a',
        })
      })

    // Add completed goals
    goals
      .filter(g => g.status === 'completed' && g.completedAt)
      .slice(0, 3)
      .forEach(goal => {
        items.push({
          id: `goal-${goal.id}`,
          type: 'goal',
          title: goal.title,
          description: 'Goal completed!',
          timestamp: goal.completedAt!,
          icon: Flag,
          color: '#e07a5f',
        })
      })

    // Add completed milestones
    milestones
      .filter(m => m.isCompleted && m.completedAt)
      .slice(0, 3)
      .forEach(milestone => {
        items.push({
          id: `milestone-${milestone.id}`,
          type: 'milestone',
          title: milestone.title,
          description: 'Milestone reached',
          timestamp: milestone.completedAt!,
          icon: CheckCircle,
          color: '#4ade80',
        })
      })

    // Add completed tasks (last 2 days)
    tasks
      .filter(t => t.column === 'complete' && !t.archivedAt && t.completedAt && t.completedAt > twoDaysAgo)
      .slice(0, 3)
      .forEach(task => {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          description: 'Task completed',
          timestamp: task.completedAt!,
          icon: CheckSquare,
          color: '#60a5fa',
        })
      })

    // Add recently updated tasks (last 2 days)
    tasks
      .filter(task => {
        if (task.archivedAt) return false
        const updatedAt = task.updatedAt ?? task.createdAt
        if (updatedAt <= twoDaysAgo) return false
        return !(task.completedAt && task.completedAt >= updatedAt)
      })
      .slice(0, 3)
      .forEach(task => {
        const updatedAt = task.updatedAt ?? task.createdAt
        items.push({
          id: `task-updated-${task.id}`,
          type: 'task',
          title: task.title,
          description: 'Task updated',
          timestamp: updatedAt,
          icon: ListChecks,
          color: '#93c5fd',
        })
      })

    // Sort by timestamp (most recent first)
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, maxItems)
  }, [completions, habits, entries, goals, milestones, tasks, maxItems])

  const formatTime = (timestamp: number) => {
    const now = new Date().getTime()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
          <Activity size={20} className="text-[var(--text-tertiary)]" />
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">No recent activity</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
          Your activities will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map(activity => {
        const Icon = activity.icon

        return (
          <div
            key={activity.id}
            className="flex items-start gap-2 p-2 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: activity.color + '20' }}
            >
              <Icon size={12} style={{ color: activity.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-primary)] truncate">
                {activity.title}
              </p>
              {activity.description && (
                <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                  {activity.description}
                </p>
              )}
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
              {formatTime(activity.timestamp)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
