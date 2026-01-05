'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Goal, GoalCategory, GoalStatus, GoalPriority, Milestone, formatDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'

interface GoalEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goal: Omit<Goal, 'id' | 'createdAt' | 'order'>, milestones: string[]) => void
  goal?: Goal
  existingMilestones?: Milestone[]
  categories: GoalCategory[]
}

export function GoalEditor({
  isOpen,
  onClose,
  onSave,
  goal,
  existingMilestones = [],
  categories,
}: GoalEditorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [targetDate, setTargetDate] = useState('')
  const [priority, setPriority] = useState<GoalPriority>('medium')
  const [milestones, setMilestones] = useState<string[]>([''])
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const syncTimeout = setTimeout(() => {
      if (goal) {
        setTitle(goal.title)
        setDescription(goal.description || '')
        setCategoryId(goal.categoryId)
        setTargetDate(goal.targetDate || '')
        setPriority(goal.priority)
        setMilestones(existingMilestones.length > 0
          ? existingMilestones.map(m => m.title)
          : ['']
        )
      } else {
        setTitle('')
        setDescription('')
        setCategoryId(undefined)
        setTargetDate('')
        setPriority('medium')
        setMilestones([''])
      }
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }, 0)

    return () => clearTimeout(syncTimeout)
  }, [isOpen, goal, existingMilestones])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId,
        targetDate: targetDate || undefined,
        startDate: goal?.startDate || formatDateKey(),
        status: goal?.status || 'active',
        progress: goal?.progress || 0,
        priority,
      },
      milestones.filter(m => m.trim())
    )

    onClose()
  }

  const addMilestone = () => {
    setMilestones([...milestones, ''])
  }

  const updateMilestone = (index: number, value: string) => {
    const updated = [...milestones]
    updated[index] = value
    setMilestones(updated)
  }

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-elevated)]">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            {goal ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Goal Title
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Learn Spanish to B2 level"
              className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this goal important?"
              rows={2}
              className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)] resize-none"
            />
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Target Date (optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as GoalPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'flex-1 px-3 py-2 text-[12px] capitalize border transition-colors',
                    priority === p
                      ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
                Category (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryId(undefined)}
                  className={cn(
                    'px-3 py-1.5 text-[11px] border transition-colors',
                    !categoryId
                      ? 'bg-[var(--bg-tertiary)] border-[var(--text-tertiary)] text-[var(--text-primary)]'
                      : 'border-[var(--border)] text-[var(--text-tertiary)]'
                  )}
                >
                  None
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'px-3 py-1.5 text-[11px] border transition-colors',
                      categoryId === cat.id
                        ? 'border-[var(--text-tertiary)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] text-[var(--text-tertiary)]'
                    )}
                    style={{
                      backgroundColor: categoryId === cat.id ? `${cat.color}20` : undefined,
                      borderColor: categoryId === cat.id ? cat.color : undefined,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Milestones (optional)
            </label>
            <div className="space-y-2">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={milestone}
                    onChange={(e) => updateMilestone(index, e.target.value)}
                    placeholder={`Milestone ${index + 1}`}
                    className="flex-1 bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
                  />
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="p-2 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMilestone}
                className="flex items-center gap-1 text-[11px] text-[var(--accent)] hover:text-[var(--accent-muted)] transition-colors"
              >
                <Plus size={12} />
                Add Milestone
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50 hover:bg-[var(--accent-muted)]"
            >
              {goal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
