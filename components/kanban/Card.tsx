'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Flag, ListChecks, Clock, Crosshair, ChevronDown } from 'lucide-react'
import { KanbanTask, Priority, PRIORITIES, LABELS, isOverdue, isDueSoon } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/useSettings'

interface CardProps {
  task: KanbanTask
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void
  onOpenDetail: (task: KanbanTask) => void
  onToggleSubtask?: (taskId: string, subtaskId: string) => void
  index?: number
  compact?: boolean
  accentColor?: string
  onFocusTask?: (taskId: string) => void
  focusedTaskId?: string | null
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'var(--text-tertiary)',
  medium: 'var(--text-secondary)',
  high: 'var(--accent)',
  urgent: '#ef4444',
}

export const Card = memo(function Card({ task, onDelete, onUpdate, onOpenDetail, onToggleSubtask, index = 0, compact = false, accentColor, onFocusTask, focusedTaskId }: CardProps) {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const { settings } = useSettings()
  const [showSubtasks, setShowSubtasks] = useState(false)
  const userToggledSubtasks = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColor = PRIORITY_COLORS[task.priority || 'medium']
  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter(s => s.completed).length
  const hasSubtasks = subtasks.length > 0
  const subtaskProgress = hasSubtasks ? Math.round((completedSubtasks / subtasks.length) * 100) : 0
  const maxSubtasksInCard = 4
  const labels = task.labels || []
  const taskLabels = LABELS.filter(l => labels.includes(l.id))
  const hasLabels = taskLabels.length > 0
  const hasDueDate = !!task.dueDate
  const overdue = hasDueDate && isOverdue(task.dueDate!)
  const dueSoon = hasDueDate && !overdue && isDueSoon(task.dueDate!)

  const handleClick = (e: React.MouseEvent) => {
    // Only open modal if not dragging and not clicking on a button
    if (!isDragging && !(e.target as HTMLElement).closest('button')) {
      onOpenDetail(task)
    }
  }

  useEffect(() => {
    if (!userToggledSubtasks.current) {
      setShowSubtasks(!!settings.expandSubtasksByDefault && hasSubtasks)
    }
  }, [settings.expandSubtasksByDefault, hasSubtasks])

  // Compact mode: just title with subtle indicators
  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleClick}
        className={cn(
          'group relative bg-[var(--bg-secondary)] cursor-pointer',
          'hover:bg-[var(--bg-tertiary)]',
          'transition-all duration-150',
          isDragging && 'opacity-40 cursor-grabbing'
        )}
        {...attributes}
        {...listeners}
      >
        {/* Column color indicator */}
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: accentColor || priorityColor }}
        />

        <div className="px-3 py-2 pl-2 flex items-center justify-between gap-2">
          <p className="text-[12px] text-[var(--text-primary)] leading-snug truncate flex-1">
            {task.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {/* Compact indicators */}
            {hasSubtasks && (
              <span className="text-[9px] text-[var(--text-tertiary)]">
                {completedSubtasks}/{subtasks.length}
              </span>
            )}
            {overdue && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
            {dueSoon && !overdue && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            {!task.archivedAt && onFocusTask && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFocusTask(task.id)
                }}
                className={cn(
                  'opacity-0 group-hover:opacity-100 p-1 -m-1 transition-all duration-150',
                  focusedTaskId === task.id
                    ? 'text-[var(--accent)] opacity-100'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'
                )}
                title={focusedTaskId === task.id ? 'Currently focusing' : 'Focus on this task'}
              >
                <Crosshair size={11} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 -m-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all duration-150"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Full mode: original card layout
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={cn(
        'group relative bg-[var(--bg-secondary)] cursor-pointer',
        'hover:bg-[var(--bg-tertiary)]',
        'transition-all duration-150',
        isDragging && 'opacity-40 cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Column color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: accentColor || priorityColor }}
      />

      <div className="p-4 pl-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed break-words">
              {task.title}
            </p>
            {task.description && (
              <p className="mt-1 text-[11px] text-[var(--text-tertiary)] leading-relaxed line-clamp-2">
                {task.description}
              </p>
            )}
            {/* Labels */}
            {hasLabels && (
              <div className="flex flex-wrap gap-1 mt-2">
                {taskLabels.map(label => (
                  <span
                    key={label.id}
                    className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.05em] font-medium"
                    style={{ color: label.color, backgroundColor: label.bg }}
                  >
                    {label.label}
                  </span>
                ))}
              </div>
            )}
            {hasSubtasks && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  <span>Subtask Progress</span>
                  <span>{completedSubtasks}/{subtasks.length}</span>
                </div>
                <div className="mt-1 h-1 w-full bg-[var(--border-subtle)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(task.id)
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 -m-1.5 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all duration-150"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {hasSubtasks && (
          <div className="mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                userToggledSubtasks.current = true
                setShowSubtasks((prev) => !prev)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <ChevronDown size={12} className={cn('transition-transform duration-200', showSubtasks && 'rotate-180')} />
              Subtasks
            </button>
            {showSubtasks && (
              <div className="mt-2 space-y-1.5">
                {subtasks.slice(0, maxSubtasksInCard).map((subtask) => (
                  <button
                    key={subtask.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleSubtask?.(task.id, subtask.id)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)] text-left"
                  >
                    <span
                      className={cn(
                        'mt-1 h-1.5 w-1.5 rounded-full border',
                        subtask.completed
                          ? 'bg-[var(--accent)] border-[var(--accent)]'
                          : 'border-[var(--text-tertiary)]'
                      )}
                    />
                    <span className={cn(subtask.completed && 'line-through text-[var(--text-tertiary)]')}>
                      {subtask.text}
                    </span>
                  </button>
                ))}
                {subtasks.length > maxSubtasksInCard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDetail(task)
                    }}
                    className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  >
                    +{subtasks.length - maxSubtasksInCard} more
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer with priority, subtasks, and date */}
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
          {/* Left side: Priority */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setShowPriorityMenu(!showPriorityMenu)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] hover:opacity-80 transition-opacity"
              style={{ color: priorityColor }}
            >
              <Flag size={10} fill={task.priority === 'urgent' || task.priority === 'high' ? priorityColor : 'none'} />
              {task.priority || 'Medium'}
            </button>

            {/* Priority dropdown */}
            {showPriorityMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPriorityMenu(false)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <div
                  className="absolute left-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[100px]"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdate(task.id, { priority: p.id })
                        setShowPriorityMenu(false)
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-[11px] uppercase tracking-[0.1em] flex items-center gap-2 hover:bg-[var(--bg-tertiary)] transition-colors',
                        task.priority === p.id && 'bg-[var(--bg-tertiary)]'
                      )}
                      style={{ color: p.color }}
                    >
                      <Flag size={10} fill={p.id === 'urgent' || p.id === 'high' ? p.color : 'none'} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right side: Subtasks count and date */}
          <div className="flex items-center gap-3">
            {!task.archivedAt && onFocusTask && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFocusTask(task.id)
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  'p-1 transition-colors',
                  focusedTaskId === task.id
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--accent)]'
                )}
                title={focusedTaskId === task.id ? 'Currently focusing' : 'Focus on this task'}
              >
                <Crosshair size={12} />
              </button>
            )}
            {hasSubtasks && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                <ListChecks size={11} />
                {completedSubtasks}/{subtasks.length} subtasks
              </span>
            )}
            {hasDueDate && (
              <span
                className={cn(
                  'flex items-center gap-1 text-[10px] uppercase tracking-[0.1em]',
                  overdue && 'text-red-400',
                  dueSoon && 'text-amber-400',
                  !overdue && !dueSoon && 'text-[var(--text-tertiary)]'
                )}
              >
                <Clock size={10} />
                {new Date(task.dueDate!).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {!hasDueDate && (
              <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                {new Date(task.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
