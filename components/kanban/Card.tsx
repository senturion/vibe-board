'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Flag } from 'lucide-react'
import { KanbanTask, Priority, PRIORITIES } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CardProps {
  task: KanbanTask
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void
  index?: number
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'var(--text-tertiary)',
  medium: 'var(--text-secondary)',
  high: 'var(--accent)',
  urgent: '#ef4444',
}

export function Card({ task, onDelete, onUpdate, index = 0 }: CardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-[var(--bg-secondary)] border-l-2',
        'hover:bg-[var(--bg-tertiary)]',
        'transition-all duration-150 cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40'
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
              <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed break-words">
                {task.description}
              </p>
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

        {/* Footer with priority and date */}
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          {/* Priority selector */}
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

          {/* Date */}
          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            {new Date(task.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
