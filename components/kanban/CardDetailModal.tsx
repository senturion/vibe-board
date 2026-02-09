'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Flag, Archive, Trash2, Plus, Check, Calendar, Tag, Clock, Crosshair, Sparkles, Loader2, MessageCircle } from 'lucide-react'
import { KanbanTask, Priority, PRIORITIES, COLUMNS, KanbanColumn, isOverdue, isDueSoon } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTagsContext } from '@/contexts/TagsContext'
import { useSettings } from '@/hooks/useSettings'
import { TagPicker, TagManager, TagBadge } from '@/components/tags'
import { ClarifyDrawer } from './ClarifyDrawer'

interface CardDetailModalProps {
  task: KanbanTask
  columns?: KanbanColumn[]
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<KanbanTask>) => void
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onAddSubtask: (taskId: string, text: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  onMoveTask: (taskId: string, column: KanbanTask['column']) => void
  onFocusTask?: (taskId: string) => void
  focusedTaskId?: string | null
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'var(--text-tertiary)',
  medium: 'var(--text-secondary)',
  high: 'var(--accent)',
  urgent: '#ef4444',
}

export function CardDetailModal({
  task,
  columns = COLUMNS,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onArchive,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onMoveTask,
  onFocusTask,
  focusedTaskId,
}: CardDetailModalProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [newSubtask, setNewSubtask] = useState('')
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [showLabelsMenu, setShowLabelsMenu] = useState(false)
  const [showDueDatePicker, setShowDueDatePicker] = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [taskTagIds, setTaskTagIds] = useState<string[]>([])
  const [generatingSubtasks, setGeneratingSubtasks] = useState(false)
  const [showClarifyDrawer, setShowClarifyDrawer] = useState(false)

  const { getTaskTagIds, setTaskTags, getTagsForTask } = useTagsContext()
  const { settings } = useSettings()
  const aiConfigured = settings.aiProvider !== 'rules'

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  // Load task tags
  useEffect(() => {
    if (isOpen && task.id) {
      getTaskTagIds(task.id).then(setTaskTagIds)
    }
  }, [isOpen, task.id, getTaskTagIds])

  // Handle tag changes
  const handleTagsChange = async (newTagIds: string[]) => {
    setTaskTagIds(newTagIds)
    await setTaskTags(task.id, newTagIds)
  }

  const selectedTags = getTagsForTask(taskTagIds)

  useEffect(() => {
    const syncTimeout = setTimeout(() => {
      setTitle(task.title)
      setDescription(task.description || '')
    }, 0)

    return () => clearTimeout(syncTimeout)
  }, [task])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      titleRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      }

      // Column shortcuts when not in an input
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        const shortcutIndex = Number.parseInt(e.key, 10)
        if (!Number.isNaN(shortcutIndex) && shortcutIndex >= 1 && shortcutIndex <= 9) {
          const shortcutColumn = columns[shortcutIndex - 1]
          if (shortcutColumn) {
            onMoveTask(task.id, shortcutColumn.id)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [columns, isOpen, task.id, onClose, onMoveTask])

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
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

  const handleGenerateSubtasks = async () => {
    if (generatingSubtasks || !task.title.trim()) return
    setGeneratingSubtasks(true)
    try {
      const res = await fetch('/api/tasks/generate-subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          existingSubtasks: (task.subtasks || []).map(s => s.text),
          priority: task.priority,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const generated: string[] = data.subtasks || []
        if (generated.length > 0) {
          const newSubtasks = generated.map(text => ({
            id: crypto.randomUUID(),
            text,
            completed: false,
          }))
          onUpdate(task.id, {
            subtasks: [...(task.subtasks || []), ...newSubtasks],
          })
        }
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setGeneratingSubtasks(false)
    }
  }

  const handleClarifiedSubtasks = (subtasks: { id: string; text: string; completed: boolean }[]) => {
    onUpdate(task.id, {
      subtasks: [...(task.subtasks || []), ...subtasks],
    })
  }

  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length
  const totalSubtasks = (task.subtasks || []).length

  if (!isOpen) return null

  const currentColumn = columns.find(c => c.id === task.column)
  const priorityColor = PRIORITY_COLORS[task.priority || 'medium']

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${task.title}`}
        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[85vh] bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl shadow-black/50 z-50 flex flex-col animate-fade-up overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-2">
              Task Details
            </p>
            <textarea
              ref={titleRef}
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
              className="w-full bg-transparent font-display text-2xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none leading-tight"
              style={{ minHeight: '2rem' }}
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Close task details"
            className="p-2 -m-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Priority */}
            <div className="relative">
              <button
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                aria-haspopup="listbox"
                aria-expanded={showPriorityMenu}
                aria-label={`Priority: ${task.priority || 'medium'}`}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
                style={{ color: priorityColor }}
              >
                <Flag size={12} fill={task.priority === 'urgent' || task.priority === 'high' ? priorityColor : 'none'} />
                {task.priority || 'Medium'}
              </button>
              {showPriorityMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPriorityMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[120px]">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
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

            {task.column === 'complete' && (task.completedAt || task.updatedAt) && (
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                <Check size={12} className="text-[var(--success)]" />
                Completed {new Date(task.completedAt || task.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}

            {/* Column/Status */}
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                aria-haspopup="listbox"
                aria-expanded={showColumnMenu}
                aria-label={`Status: ${currentColumn?.title || task.column}`}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
              >
                {currentColumn?.title || task.column}
              </button>
              {showColumnMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[140px]">
                    {columns.map((col, idx) => (
                      <button
                        key={col.id}
                        onClick={() => {
                          onMoveTask(task.id, col.id)
                          setShowColumnMenu(false)
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-[11px] uppercase tracking-[0.1em] flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors',
                          task.column === col.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                        )}
                      >
                        {col.title}
                        <span className="text-[var(--text-tertiary)]">{idx < 9 ? idx + 1 : '•'}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Focus */}
            {!task.archivedAt && onFocusTask && (
              <button
                onClick={() => {
                  onFocusTask(task.id)
                  onClose()
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] border transition-colors',
                  focusedTaskId === task.id
                    ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-glow)]'
                    : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
                )}
              >
                <Crosshair size={12} />
                {focusedTaskId === task.id ? 'Focusing' : 'Focus'}
              </button>
            )}

            {/* Tags */}
            <div className="relative">
              <button
                onClick={() => setShowLabelsMenu(!showLabelsMenu)}
                aria-haspopup="true"
                aria-expanded={showLabelsMenu}
                aria-label={`Tags${taskTagIds.length > 0 ? `: ${taskTagIds.length} selected` : ''}`}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
              >
                <Tag size={12} />
                Tags
                {taskTagIds.length > 0 && (
                  <span className="text-[10px] px-1.5 bg-[var(--bg-tertiary)]">
                    {taskTagIds.length}
                  </span>
                )}
              </button>
              {showLabelsMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLabelsMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 w-64 p-3">
                    <TagPicker
                      selectedTagIds={taskTagIds}
                      onTagsChange={handleTagsChange}
                      onOpenManager={() => {
                        setShowLabelsMenu(false)
                        setShowTagManager(true)
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Due Date */}
            <div className="relative">
              <button
                onClick={() => setShowDueDatePicker(!showDueDatePicker)}
                aria-haspopup="true"
                aria-expanded={showDueDatePicker}
                aria-label={task.dueDate ? `Due date: ${new Date(task.dueDate).toLocaleDateString()}` : 'Set due date'}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors',
                  task.dueDate && isOverdue(task.dueDate) ? 'text-red-400 border-red-400/30' : undefined,
                  task.dueDate && isDueSoon(task.dueDate) && !isOverdue(task.dueDate) ? 'text-amber-400 border-amber-400/30' : undefined,
                  !task.dueDate ? 'text-[var(--text-secondary)]' : undefined
                )}
              >
                <Clock size={12} />
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Due Date'}
              </button>
              {showDueDatePicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDueDatePicker(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 p-3">
                    <input
                      type="date"
                      value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value).getTime() : undefined
                        onUpdate(task.id, { dueDate: date })
                        setShowDueDatePicker(false)
                      }}
                      className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                    />
                    {task.dueDate && (
                      <button
                        onClick={() => {
                          onUpdate(task.id, { dueDate: undefined })
                          setShowDueDatePicker(false)
                        }}
                        className="mt-2 w-full text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Created date */}
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
              <Calendar size={12} />
              {new Date(task.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Active Tags Display */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <TagBadge
                  key={tag.id}
                  tag={tag}
                  size="md"
                  onRemove={() => handleTagsChange(taskTagIds.filter(id => id !== tag.id))}
                />
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add a description..."
              rows={4}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-4 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:italic outline-none resize-none leading-relaxed focus:border-[var(--text-tertiary)] transition-colors"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                  Subtasks
                </label>
                {aiConfigured && (
                  <>
                    <button
                      onClick={handleGenerateSubtasks}
                      disabled={generatingSubtasks || !task.title.trim()}
                      title="Generate subtasks with AI"
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] disabled:opacity-40 transition-colors"
                    >
                      {generatingSubtasks ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                    </button>
                    <button
                      onClick={() => setShowClarifyDrawer(true)}
                      disabled={!task.title.trim()}
                      title="Clarify task before generating subtasks"
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] disabled:opacity-40 transition-colors"
                    >
                      <MessageCircle size={12} />
                    </button>
                  </>
                )}
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
              {(task.subtasks || []).map((subtask) => (
                <div
                  key={subtask.id}
                  className="group flex items-center gap-3 py-2 px-3 -mx-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <button
                    onClick={() => onToggleSubtask(task.id, subtask.id)}
                    role="checkbox"
                    aria-checked={subtask.completed}
                    aria-label={`${subtask.completed ? 'Uncheck' : 'Check'} subtask: ${subtask.text}`}
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
                    aria-label={`Delete subtask: ${subtask.text}`}
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
                  if (e.key === 'Enter') {
                    handleAddSubtask()
                  }
                }}
                placeholder="Add a subtask..."
                className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border-b border-[var(--border)] py-2 focus:border-[var(--text-tertiary)] transition-colors"
              />
              <button
                onClick={handleAddSubtask}
                disabled={!newSubtask.trim()}
                aria-label="Add subtask"
                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--accent)] disabled:opacity-40 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onArchive(task.id)
                onClose()
              }}
              className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
            >
              <Archive size={14} />
              Archive
            </button>
            <button
              onClick={() => {
                onDelete(task.id)
                onClose()
              }}
              className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-red-400 border border-transparent hover:border-red-400/30 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 text-[11px] uppercase tracking-[0.1em] font-medium bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Tag Manager Modal */}
      <TagManager isOpen={showTagManager} onClose={() => setShowTagManager(false)} />

      {/* Clarify Drawer */}
      <ClarifyDrawer
        isOpen={showClarifyDrawer}
        onClose={() => setShowClarifyDrawer(false)}
        task={task}
        onSubtasksGenerated={handleClarifiedSubtasks}
      />
    </>
  )
}
