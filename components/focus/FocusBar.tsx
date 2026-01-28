'use client'

import { Crosshair, Pause, Play, X, ListChecks } from 'lucide-react'
import { KanbanTask } from '@/lib/types'

interface FocusBarProps {
  task: KanbanTask
  timeRemaining: number
  isRunning: boolean
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onNavigateToFocus: () => void
  onStopFocus: () => void
}

export function FocusBar({
  task,
  timeRemaining,
  isRunning,
  isPaused,
  onPause,
  onResume,
  onNavigateToFocus,
  onStopFocus,
}: FocusBarProps) {
  const subtasks = task.subtasks || []
  const completed = subtasks.filter(s => s.completed).length
  const total = subtasks.length

  const mins = Math.floor(timeRemaining / 60)
  const secs = timeRemaining % 60
  const timeDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)]">
      {/* Focus indicator + task title */}
      <button
        onClick={onNavigateToFocus}
        className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
      >
        <Crosshair size={14} className="text-[var(--accent)] shrink-0" />
        <span className="text-[12px] text-[var(--text-primary)] truncate">
          {task.title}
        </span>
      </button>

      {/* Subtask progress */}
      {total > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          <ListChecks size={12} className="text-[var(--text-tertiary)]" />
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {completed}/{total}
          </span>
          <div className="w-16 h-1 bg-[var(--bg-tertiary)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Timer */}
      <span className="text-[12px] font-mono text-[var(--text-secondary)] shrink-0 tabular-nums">
        {isRunning ? timeDisplay : 'Ready'}
      </span>

      {/* Pause/Resume */}
      {isRunning && (
        <button
          onClick={isPaused ? onResume : onPause}
          className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}

      {/* Stop focus */}
      <button
        onClick={onStopFocus}
        className="p-1.5 text-[var(--text-tertiary)] hover:text-red-400 border border-[var(--border)] hover:border-red-400/30 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  )
}
