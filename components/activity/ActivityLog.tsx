'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  Target,
  BookOpen,
  Flag,
  CheckCircle,
  CheckSquare,
  Calendar,
  Filter,
  Clock,
} from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useJournal } from '@/hooks/useJournal'
import { useGoals } from '@/hooks/useGoals'
import { useKanban } from '@/hooks/useKanban'
import { useRoutines } from '@/hooks/useRoutines'
import { formatDateKey, parseDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'

type ActivityType = 'all' | 'habits' | 'tasks' | 'goals' | 'journal' | 'routines'

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description?: string
  timestamp: number
  icon: typeof Activity
  color: string
}

export function ActivityLog() {
  const [filter, setFilter] = useState<ActivityType>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')

  const { completions, habits } = useHabits()
  const { entries } = useJournal()
  const { goals, milestones } = useGoals()
  const { tasks } = useKanban()
  const { completions: routineCompletions, routines, items: routineItems } = useRoutines()

  const activities = useMemo(() => {
    const items: ActivityItem[] = []
    const now = new Date().getTime()

    // Calculate date threshold based on range
    let threshold = 0
    switch (dateRange) {
      case 'today':
        threshold = now - 24 * 60 * 60 * 1000
        break
      case 'week':
        threshold = now - 7 * 24 * 60 * 60 * 1000
        break
      case 'month':
        threshold = now - 30 * 24 * 60 * 60 * 1000
        break
      case 'all':
        threshold = 0
        break
    }

    // Habit completions
    if (filter === 'all' || filter === 'habits') {
      completions
        .filter(c => c.completedAt > threshold)
        .forEach(completion => {
          const habit = habits.find(h => h.id === completion.habitId)
          if (habit) {
            items.push({
              id: `habit-${completion.id}`,
              type: 'habits',
              title: habit.name,
              description: completion.count > 1 ? `Completed ${completion.count} times` : 'Completed',
              timestamp: completion.completedAt,
              icon: Target,
              color: habit.color,
            })
          }
        })
    }

    // Task completions and updates
    if (filter === 'all' || filter === 'tasks') {
      tasks
        .filter(t => t.column === 'complete' && t.completedAt && t.completedAt > threshold)
        .forEach(task => {
          items.push({
            id: `task-${task.id}`,
            type: 'tasks',
            title: task.title,
            description: 'Task completed',
            timestamp: task.completedAt!,
            icon: CheckSquare,
            color: '#60a5fa',
          })
        })

      tasks
        .filter(task => {
          if (task.archivedAt) return false
          const updatedAt = task.updatedAt ?? task.createdAt
          if (updatedAt <= threshold) return false
          return !(task.completedAt && task.completedAt >= updatedAt)
        })
        .forEach(task => {
          const updatedAt = task.updatedAt ?? task.createdAt
          items.push({
            id: `task-updated-${task.id}`,
            type: 'tasks',
            title: task.title,
            description: 'Task updated',
            timestamp: updatedAt,
            icon: Clock,
            color: '#93c5fd',
          })
        })
    }

    // Journal entries
    if (filter === 'all' || filter === 'journal') {
      entries
        .filter(e => e.updatedAt > threshold)
        .forEach(entry => {
          items.push({
            id: `journal-${entry.id}`,
            type: 'journal',
            title: 'Journal Entry',
            description: entry.content.slice(0, 100) + (entry.content.length > 100 ? '...' : ''),
            timestamp: entry.updatedAt,
            icon: BookOpen,
            color: '#81b29a',
          })
        })
    }

    // Goal completions
    if (filter === 'all' || filter === 'goals') {
      goals
        .filter(g => g.status === 'completed' && g.completedAt && g.completedAt > threshold)
        .forEach(goal => {
          items.push({
            id: `goal-${goal.id}`,
            type: 'goals',
            title: goal.title,
            description: 'Goal achieved!',
            timestamp: goal.completedAt!,
            icon: Flag,
            color: '#e07a5f',
          })
        })

      // Milestone completions
      milestones
        .filter(m => m.isCompleted && m.completedAt && m.completedAt > threshold)
        .forEach(milestone => {
          items.push({
            id: `milestone-${milestone.id}`,
            type: 'goals',
            title: milestone.title,
            description: 'Milestone reached',
            timestamp: milestone.completedAt!,
            icon: CheckCircle,
            color: '#4ade80',
          })
        })
    }

    // Routine completions
    if (filter === 'all' || filter === 'routines') {
      routineCompletions
        .filter(c => c.completedAt > threshold)
        .forEach(completion => {
          const routineItem = routineItems.find(item => item.id === completion.routineItemId)
          const routine = routineItem ? routines.find(r => r.id === routineItem.routineId) : null
          if (routine && routineItem) {
            items.push({
              id: `routine-${completion.id}`,
              type: 'routines',
              title: routineItem.title,
              description: `${routine.name}`,
              timestamp: completion.completedAt,
              icon: Calendar,
              color: '#a78bfa',
            })
          }
        })
    }

    // Sort by timestamp (most recent first)
    return items.sort((a, b) => b.timestamp - a.timestamp)
  }, [filter, dateRange, completions, habits, tasks, entries, goals, milestones, routineCompletions, routines, routineItems])

  const formatTimestamp = (timestamp: number) => {
    const now = new Date().getTime()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: days > 365 ? 'numeric' : undefined,
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { date: string; items: ActivityItem[] }[] = []
    let currentDate = ''

    activities.forEach(activity => {
      const date = formatDateKey(new Date(activity.timestamp))
      if (date !== currentDate) {
        currentDate = date
        groups.push({ date, items: [] })
      }
      groups[groups.length - 1].items.push(activity)
    })

    return groups
  }, [activities])

  const typeOrder: ActivityType[] = ['tasks', 'habits', 'goals', 'journal', 'routines']
  const typeLabels: Record<ActivityType, string> = {
    all: 'All',
    tasks: 'Tasks',
    habits: 'Habits',
    goals: 'Goals',
    journal: 'Journal',
    routines: 'Routines',
  }

  const filterOptions: { id: ActivityType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'habits', label: 'Habits' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'goals', label: 'Goals' },
    { id: 'journal', label: 'Journal' },
    { id: 'routines', label: 'Routines' },
  ]

  const dateRangeOptions: { id: typeof dateRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-[var(--accent)]" />
          <h1 className="text-lg font-medium text-[var(--text-primary)]">Activity Log</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Type:</span>
            <div className="flex gap-1">
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                  className={cn(
                    "px-2 py-1 text-[11px] rounded transition-colors",
                    filter === option.id
                      ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Range:</span>
            <div className="flex gap-1">
              {dateRangeOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setDateRange(option.id)}
                  className={cn(
                    "px-2 py-1 text-[11px] rounded transition-colors",
                    dateRange === option.id
                      ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-auto p-6">
        {groupedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Activity size={48} className="text-[var(--text-tertiary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-2">No activity found</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">
              Complete habits, tasks, or goals to see your activity here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#93c5fd]" />
                Task updated
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
                Task completed
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7f9cf5]" />
                Habits
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#81b29a]" />
                Journal
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e07a5f]" />
                Goals
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                Routines
              </span>
            </div>
            {groupedActivities.map(group => {
              const groupedByType = typeOrder.map(type => ({
                type,
                items: group.items.filter(item => item.type === type),
              })).filter(grouped => grouped.items.length > 0)

              return (
                <div key={group.date}>
                  <h2 className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-3 sticky top-0 bg-[var(--bg-primary)] py-1">
                    {formatDate(parseDateKey(group.date).getTime())}
                  </h2>
                  <div className="space-y-5">
                    {groupedByType.map(typeGroup => (
                      <div key={typeGroup.type} className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                          <span>{typeLabels[typeGroup.type]}</span>
                          <span>{typeGroup.items.length}</span>
                        </div>
                        {typeGroup.items.map(activity => {
                          const Icon = activity.icon
                          const taskBadge = activity.type === 'tasks'
                            ? activity.description === 'Task updated'
                              ? 'Updated'
                              : activity.description === 'Task completed'
                                ? 'Completed'
                                : null
                            : null
                          return (
                            <div
                              key={activity.id}
                              className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border)] transition-colors"
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: activity.color + '20' }}
                              >
                                <Icon size={16} style={{ color: activity.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-[var(--text-primary)] font-medium">
                                    {activity.title}
                                  </p>
                                  {taskBadge && (
                                    <span className="px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] border border-[var(--border)]">
                                      {taskBadge}
                                    </span>
                                  )}
                                </div>
                                {activity.description && (
                                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-2">
                                    {activity.description}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                                {formatTimestamp(activity.timestamp)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Showing {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          {filter !== 'all' && ` in ${filter}`}
          {dateRange !== 'all' && ` from ${dateRangeOptions.find(o => o.id === dateRange)?.label.toLowerCase()}`}
        </p>
      </div>
    </div>
  )
}
