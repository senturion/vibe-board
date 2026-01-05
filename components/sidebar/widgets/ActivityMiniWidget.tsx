'use client'

import { useMemo } from 'react'
import { Activity, Target, BookOpen, Flag, CheckCircle, CheckSquare } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useJournal } from '@/hooks/useJournal'
import { useGoals } from '@/hooks/useGoals'
import { useKanban } from '@/hooks/useKanban'
import { formatDateKey } from '@/lib/types'

interface ActivityItem {
  id: string
  title: string
  timestamp: number
  icon: typeof Activity
  color: string
}

export function ActivityMiniWidget() {
  const { completions, habits } = useHabits()
  const { entries } = useJournal()
  const { goals, milestones } = useGoals()
  const { tasks } = useKanban()

  const activities = useMemo(() => {
    const items: ActivityItem[] = []
    const today = formatDateKey(new Date())
    const yesterday = formatDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000

    // Recent habit completions
    completions
      .filter(c => c.completionDate === today || c.completionDate === yesterday)
      .forEach(completion => {
        const habit = habits.find(h => h.id === completion.habitId)
        if (habit) {
          items.push({
            id: `habit-${completion.id}`,
            title: `Completed: ${habit.name}`,
            timestamp: completion.completedAt,
            icon: Target,
            color: habit.color,
          })
        }
      })

    // Recent completed tasks (with completedAt timestamp)
    tasks
      .filter(t => t.column === 'complete' && !t.archivedAt && t.completedAt && t.completedAt > twoDaysAgo)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 3)
      .forEach(task => {
        items.push({
          id: `task-${task.id}`,
          title: `Done: ${task.title}`,
          timestamp: task.completedAt!,
          icon: CheckSquare,
          color: '#60a5fa',
        })
      })

    // Recent journal entries
    entries
      .filter(e => e.entryDate === today || e.entryDate === yesterday)
      .forEach(entry => {
        items.push({
          id: `journal-${entry.id}`,
          title: 'Wrote journal entry',
          timestamp: entry.updatedAt,
          icon: BookOpen,
          color: '#81b29a',
        })
      })

    // Recent completed milestones
    milestones
      .filter(m => m.isCompleted && m.completedAt && m.completedAt > twoDaysAgo)
      .forEach(milestone => {
        items.push({
          id: `milestone-${milestone.id}`,
          title: `Milestone: ${milestone.title}`,
          timestamp: milestone.completedAt!,
          icon: CheckCircle,
          color: '#4ade80',
        })
      })

    // Recent completed goals
    goals
      .filter(g => g.status === 'completed' && g.completedAt && g.completedAt > twoDaysAgo)
      .forEach(goal => {
        items.push({
          id: `goal-${goal.id}`,
          title: `Goal achieved: ${goal.title}`,
          timestamp: goal.completedAt!,
          icon: Flag,
          color: '#e07a5f',
        })
      })

    // Sort by timestamp (most recent first) and take top items
    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
  }, [completions, habits, entries, milestones, goals, tasks])

  function formatTime(timestamp: number) {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return 'Yesterday'
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-[10px] text-[var(--text-tertiary)]">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {activities.map(activity => {
        const Icon = activity.icon
        return (
          <div
            key={activity.id}
            className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-tertiary)]"
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ backgroundColor: activity.color + '20' }}
            >
              <Icon size={10} style={{ color: activity.color }} />
            </div>
            <span className="text-[10px] text-[var(--text-secondary)] truncate flex-1">
              {activity.title}
            </span>
            <span className="text-[9px] text-[var(--text-tertiary)]">
              {formatTime(activity.timestamp)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
