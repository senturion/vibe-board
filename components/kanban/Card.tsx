'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Flag, ListChecks, Clock } from 'lucide-react'
import { KanbanTask, Priority, PRIORITIES, LABELS, isOverdue, isDueSoon } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CardProps {
  task: KanbanTask
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void
  onOpenDetail: (task: KanbanTask) => void
  index?: number
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'var(--text-tertiary)',
  medium: 'var(--text-secondary)',
  high: 'var(--accent)',
  urgent: '#ef4444',
}

export function Card({ task, onDelete, onUpdate, onOpenDetail, index = 0 }: CardProps) {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={cn(
        'group relative bg-[var(--bg-secondary)] border-l-2 cursor-pointer',
        'hover:bg-[var(--bg-tertiary)]',
        'transition-all duration-150',
        isDragging && 'opacity-40 cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Priority color indicator */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: priorityColor }}
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
            {hasSubtasks && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                <ListChecks size={11} />
                {completedSubtasks}/{subtasks.length}
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
}
