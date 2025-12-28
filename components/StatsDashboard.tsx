'use client'

import { useMemo } from 'react'
import { X, TrendingUp, CheckCircle2, Clock, AlertTriangle, BarChart3 } from 'lucide-react'
import { KanbanTask, COLUMNS, PRIORITIES, LABELS, isOverdue } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatsDashboardProps {
  isOpen: boolean
  onClose: () => void
  tasks: KanbanTask[]
}

export function StatsDashboard({ isOpen, onClose, tasks }: StatsDashboardProps) {
  const stats = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.archivedAt)
    const completedTasks = activeTasks.filter(t => t.column === 'complete')
    const overdueTasks = activeTasks.filter(t => t.dueDate && isOverdue(t.dueDate) && t.column !== 'complete')
    const archivedTasks = tasks.filter(t => t.archivedAt)

    // By column
    const byColumn = COLUMNS.map(col => ({
      ...col,
      count: activeTasks.filter(t => t.column === col.id).length,
    }))

    // By priority
    const byPriority = PRIORITIES.map(p => ({
      ...p,
      count: activeTasks.filter(t => t.priority === p.id).length,
    }))

    // By label
    const byLabel = LABELS.map(l => ({
      ...l,
      count: activeTasks.filter(t => (t.labels || []).includes(l.id)).length,
    })).filter(l => l.count > 0)

    // Completion rate
    const completionRate = activeTasks.length > 0
      ? Math.round((completedTasks.length / activeTasks.length) * 100)
      : 0

    // Weekly activity (last 7 days)
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const tasksThisWeek = tasks.filter(t => t.createdAt >= weekAgo).length
    const completedThisWeek = tasks.filter(t =>
      t.column === 'complete' && t.createdAt >= weekAgo
    ).length

    return {
      total: activeTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
      archived: archivedTasks.length,
      completionRate,
      byColumn,
      byPriority,
      byLabel,
      tasksThisWeek,
      completedThisWeek,
    }
  }, [tasks])

  if (!isOpen) return null

  const maxColumnCount = Math.max(...stats.byColumn.map(c => c.count), 1)
  const maxPriorityCount = Math.max(...stats.byPriority.map(p => p.count), 1)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl shadow-black/50 z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">
              Analytics
            </p>
            <h2 className="font-display text-2xl text-[var(--text-primary)] tracking-tight italic">
              Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
                <BarChart3 size={14} />
                <span className="text-[10px] uppercase tracking-[0.1em]">Total Active</span>
              </div>
              <p className="font-display text-3xl text-[var(--text-primary)] animate-count-up">
                {stats.total}
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--success)] mb-2">
                <CheckCircle2 size={14} />
                <span className="text-[10px] uppercase tracking-[0.1em]">Completed</span>
              </div>
              <p className="font-display text-3xl text-[var(--text-primary)] animate-count-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
                {stats.completed}
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle size={14} />
                <span className="text-[10px] uppercase tracking-[0.1em]">Overdue</span>
              </div>
              <p className="font-display text-3xl text-[var(--text-primary)] animate-count-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
                {stats.overdue}
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
                <TrendingUp size={14} />
                <span className="text-[10px] uppercase tracking-[0.1em]">This Week</span>
              </div>
              <p className="font-display text-3xl text-[var(--text-primary)] animate-count-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
                +{stats.tasksThisWeek}
              </p>
            </div>
          </div>

          {/* Completion Ring */}
          <div className="p-6 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="8"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - stats.completionRate / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    style={{
                      '--circumference': `${2 * Math.PI * 42}`,
                      '--offset': `${2 * Math.PI * 42 * (1 - stats.completionRate / 100)}`,
                    } as React.CSSProperties}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-2xl text-[var(--text-primary)]">
                    {stats.completionRate}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-1">
                  Completion Rate
                </p>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  {stats.completed} of {stats.total} tasks completed
                </p>
              </div>
            </div>
          </div>

          {/* Tasks by Column */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-4">
              By Column
            </h3>
            <div className="space-y-3">
              {stats.byColumn.map((col, index) => (
                <div key={col.id} className="flex items-center gap-3">
                  <span className="w-24 text-[12px] text-[var(--text-secondary)] truncate">
                    {col.title}
                  </span>
                  <div className="flex-1 h-6 bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full animate-bar-grow"
                      style={{
                        width: `${(col.count / maxColumnCount) * 100}%`,
                        backgroundColor: index === 2 ? 'var(--success)' : 'var(--accent)',
                        animationDelay: `${index * 0.1}s`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[12px] text-[var(--text-primary)] font-medium">
                    {col.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks by Priority */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-4">
              By Priority
            </h3>
            <div className="space-y-3">
              {stats.byPriority.map((priority, index) => (
                <div key={priority.id} className="flex items-center gap-3">
                  <span
                    className="w-24 text-[12px] truncate"
                    style={{ color: priority.color }}
                  >
                    {priority.label}
                  </span>
                  <div className="flex-1 h-6 bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full animate-bar-grow"
                      style={{
                        width: `${(priority.count / maxPriorityCount) * 100}%`,
                        backgroundColor: priority.color,
                        animationDelay: `${0.3 + index * 0.1}s`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[12px] text-[var(--text-primary)] font-medium">
                    {priority.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks by Label */}
          {stats.byLabel.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-4">
                By Label
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.byLabel.map(label => (
                  <div
                    key={label.id}
                    className="px-3 py-2 text-[11px] font-medium"
                    style={{ color: label.color, backgroundColor: label.bg }}
                  >
                    {label.label}
                    <span className="ml-2 opacity-70">{label.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived */}
          {stats.archived > 0 && (
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-tertiary)]">Archived Tasks</span>
                <span className="text-[var(--text-secondary)]">{stats.archived}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
