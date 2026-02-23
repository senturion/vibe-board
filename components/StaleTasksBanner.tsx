'use client'

import { useState } from 'react'
import { AlarmClockOff, BellOff, ChevronDown, X, Eye, ExternalLink, ArrowRight } from 'lucide-react'
import { KanbanTask, Board, ColumnId } from '@/lib/types'
import { cn } from '@/lib/utils'

const SNOOZE_OPTIONS = [
  { label: '1 day', ms: 1 * 24 * 60 * 60 * 1000 },
  { label: '3 days', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '14 days', ms: 14 * 24 * 60 * 60 * 1000 },
  { label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
]

function formatRelativeTime(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

interface StaleTasksBannerProps {
  staleTasks: KanbanTask[]
  boards: Board[]
  onSnooze: (taskId: string, durationMs?: number) => void
  onSnoozeAll: (durationMs: number) => void
  onDismiss: () => void
  onViewTask: (task: KanbanTask) => void
  onMoveTask: (taskId: string, column: ColumnId) => void
}

export function StaleTasksBanner({ staleTasks, boards, onSnooze, onSnoozeAll, onDismiss, onViewTask, onMoveTask }: StaleTasksBannerProps) {
  const [showTasks, setShowTasks] = useState(false)
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false)
  const [taskSnoozeMenuId, setTaskSnoozeMenuId] = useState<string | null>(null)
  const [taskMoveMenuId, setTaskMoveMenuId] = useState<string | null>(null)

  if (staleTasks.length === 0) return null

  const boardNameMap = new Map(boards.map(b => [b.id, b.name]))
  const count = staleTasks.length

  return (
    <div className="border-b border-amber-400/20 bg-amber-400/5">
      {/* Main banner row */}
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-2.5">
        <AlarmClockOff size={14} className="text-amber-400 shrink-0" />
        <p className="text-[12px] text-[var(--text-primary)] flex-1">
          You have <span className="text-amber-400 font-medium">{count} task{count === 1 ? '' : 's'}</span> that
          {count === 1 ? " hasn't" : " haven't"} been touched in a while
        </p>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Show Tasks */}
          <button
            onClick={() => setShowTasks(!showTasks)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] border transition-colors',
              showTasks
                ? 'text-amber-400 border-amber-400/40'
                : 'text-[var(--text-tertiary)] border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            )}
          >
            <Eye size={11} />
            Tasks
            <ChevronDown size={10} className={cn('transition-transform', showTasks && 'rotate-180')} />
          </button>

          {/* Snooze All */}
          <div className="relative">
            <button
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <BellOff size={11} />
              Snooze All
            </button>
            {showSnoozeMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSnoozeMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[120px]">
                  {SNOOZE_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        onSnoozeAll(opt.ms)
                        setShowSnoozeMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded task list */}
      {showTasks && (
        <div className="px-4 sm:px-6 lg:px-8 pb-3">
          <div className="border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] max-h-[240px] overflow-y-auto">
            {staleTasks.map(task => (
              <div key={task.id} className="group flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[var(--text-primary)] truncate">{task.title}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)]">
                    {task.boardId ? boardNameMap.get(task.boardId) ?? '' : ''}
                    {' · '}
                    {formatRelativeTime(task.updatedAt ?? task.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* View task */}
                  <button
                    onClick={() => onViewTask(task)}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
                  >
                    <ExternalLink size={9} />
                    View
                  </button>
                  {/* Move task */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setTaskMoveMenuId(taskMoveMenuId === task.id ? null : task.id)
                        setTaskSnoozeMenuId(null)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
                    >
                      <ArrowRight size={9} />
                      Move
                    </button>
                    {taskMoveMenuId === task.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setTaskMoveMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[100px]">
                          <button
                            onClick={() => {
                              onMoveTask(task.id, 'backlog')
                              setTaskMoveMenuId(null)
                            }}
                            className="w-full px-3 py-1.5 text-left text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                          >
                            Backlog
                          </button>
                          <button
                            onClick={() => {
                              onMoveTask(task.id, 'complete')
                              setTaskMoveMenuId(null)
                            }}
                            className="w-full px-3 py-1.5 text-left text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Per-task snooze */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setTaskSnoozeMenuId(taskSnoozeMenuId === task.id ? null : task.id)
                        setTaskMoveMenuId(null)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
                    >
                      <BellOff size={9} />
                      Snooze
                    </button>
                    {taskSnoozeMenuId === task.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setTaskSnoozeMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[100px]">
                          {SNOOZE_OPTIONS.map(opt => (
                            <button
                              key={opt.label}
                              onClick={() => {
                                onSnooze(task.id, opt.ms)
                                setTaskSnoozeMenuId(null)
                              }}
                              className="w-full px-3 py-1.5 text-left text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
