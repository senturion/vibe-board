'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Check, Flag, Clock, Crosshair, ListChecks } from 'lucide-react'
import { KanbanTask, Priority, LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FocusTaskPanelProps {
  task: KanbanTask
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void
  onAddSubtask: (taskId: string, text: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  onStopFocus: () => void
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'var(--text-tertiary)',
  medium: 'var(--text-secondary)',
  high: 'var(--accent)',
  urgent: '#ef4444',
}

export function FocusTaskPanel({
  task,
  onUpdate,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onStopFocus,
}: FocusTaskPanelProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [newSubtask, setNewSubtask] = useState('')
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  // Sync state when task changes externally
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description || '')
  }, [task.id, task.title, task.description])

  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter(s => s.completed).length
  const totalSubtasks = subtasks.length
  const priorityColor = PRIORITY_COLORS[task.priority || 'medium']
  const taskLabels = LABELS.filter(l => (task.labels || []).includes(l.id))

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== (task.description || '')) {
      onUpdate(task.id, { description: description || undefined })
    }
  }

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onAddSubtask(task.id, newSubtask.trim())
      setNewSubtask('')
      subtaskInputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Crosshair size={16} className="text-[var(--accent)] shrink-0" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          Focusing
        </p>
      </div>

      {/* Title */}
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleTitleBlur()
          }
        }}
        placeholder="Task title..."
        rows={1}
        className="w-full bg-transparent font-display text-2xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none leading-tight mb-4"
        style={{ minHeight: '2rem' }}
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleDescriptionBlur}
        placeholder="Add a description..."
        rows={2}
        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:italic outline-none resize-none leading-relaxed focus:border-[var(--text-tertiary)] transition-colors mb-6"
      />

      {/* Subtasks */}
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks size={14} className="text-[var(--text-tertiary)]" />
            <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
              Subtasks
            </label>
          </div>
          {totalSubtasks > 0 && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {completedSubtasks}/{totalSubtasks}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalSubtasks > 0 && (
          <div className="h-1 bg-[var(--bg-tertiary)] mb-4 overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        )}

        {/* Subtask list */}
        <div className="space-y-1 mb-3">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="group flex items-center gap-3 py-2 px-3 -mx-3 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <button
                onClick={() => onToggleSubtask(task.id, subtask.id)}
                className={cn(
                  'w-4 h-4 border flex items-center justify-center shrink-0 transition-all',
                  subtask.completed
                    ? 'bg-[var(--accent)] border-[var(--accent)]'
                    : 'border-[var(--text-tertiary)] hover:border-[var(--text-secondary)]'
                )}
              >
                {subtask.completed && <Check size={10} className="text-[var(--bg-primary)]" strokeWidth={3} />}
              </button>
              <span
                className={cn(
                  'flex-1 text-[13px]',
                  subtask.completed
                    ? 'text-[var(--text-tertiary)] line-through'
                    : 'text-[var(--text-primary)]'
                )}
              >
                {subtask.text}
              </span>
              <button
                onClick={() => onDeleteSubtask(task.id, subtask.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add subtask */}
        <div className="flex items-center gap-2">
          <input
            ref={subtaskInputRef}
            type="text"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask()
            }}
            placeholder="Add a subtask..."
            className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border-b border-[var(--border)] py-2 focus:border-[var(--text-tertiary)] transition-colors"
          />
          <button
            onClick={handleAddSubtask}
            disabled={!newSubtask.trim()}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent)] disabled:opacity-40 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <span
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: priorityColor }}
        >
          <Flag size={10} fill={task.priority === 'urgent' || task.priority === 'high' ? priorityColor : 'none'} />
          {task.priority || 'Medium'}
        </span>
        {taskLabels.map(label => (
          <span
            key={label.id}
            className="px-1.5 py-0.5 text-[9px] uppercase tracking-[0.05em] font-medium"
            style={{ color: label.color, backgroundColor: label.bg }}
          >
            {label.label}
          </span>
        ))}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <Clock size={10} />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Stop Focusing */}
      <button
        onClick={onStopFocus}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X size={14} />
        Stop Focusing
      </button>
    </div>
  )
}
