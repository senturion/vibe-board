'use client'

import { useState } from 'react'
import { Check, MoreHorizontal, Edit2, Trash2, Plus, Clock } from 'lucide-react'
import { Routine, RoutineItem, DAYS_OF_WEEK } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/Progress'
import { RoutineLocationBadge } from './RoutineLocationBadge'

interface RoutineCardProps {
  routine: Routine
  items: RoutineItem[]
  progress: { completed: number; total: number; percentage: number }
  isItemCompleted: (itemId: string) => boolean
  onToggleItem: (itemId: string) => void
  onEdit: () => void
  onDelete: () => void
  onAddItem: (title: string) => void
  onUpdateItem: (itemId: string, updates: Partial<RoutineItem>) => void
  onDeleteItem: (itemId: string) => void
  compact?: boolean
}

export function RoutineCard({
  routine,
  items,
  progress,
  isItemCompleted,
  onToggleItem,
  onEdit,
  onDelete,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  compact = false,
}: RoutineCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingTargetTime, setEditingTargetTime] = useState('')

  const getDaysLabel = () => {
    if (routine.daysOfWeek.length === 7) return 'Every day'
    if (routine.daysOfWeek.length === 5 &&
        routine.daysOfWeek.every(d => d >= 1 && d <= 5)) {
      return 'Weekdays'
    }
    if (routine.daysOfWeek.length === 2 &&
        routine.daysOfWeek.includes(6) && routine.daysOfWeek.includes(7)) {
      return 'Weekends'
    }
    return routine.daysOfWeek
      .map(d => DAYS_OF_WEEK.find(day => day.id === d)?.short)
      .join(', ')
  }

  const handleAddItem = () => {
    if (newItemTitle.trim()) {
      onAddItem(newItemTitle.trim())
      setNewItemTitle('')
      setShowAddItem(false)
    }
  }

  const startEditing = (item: RoutineItem) => {
    setEditingItemId(item.id)
    setEditingTitle(item.title)
    setEditingTargetTime(item.targetTime ? String(item.targetTime) : '')
  }

  const cancelEditing = () => {
    setEditingItemId(null)
    setEditingTitle('')
    setEditingTargetTime('')
  }

  const saveEditing = () => {
    if (!editingItemId) return
    const nextTitle = editingTitle.trim()
    if (!nextTitle) {
      cancelEditing()
      return
    }

    const nextTarget = editingTargetTime.trim()
    const targetTime = nextTarget ? Math.max(1, parseInt(nextTarget, 10) || 0) : undefined
    onUpdateItem(editingItemId, { title: nextTitle, targetTime })
    cancelEditing()
  }

  if (compact) {
    return (
      <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-all">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-medium text-[var(--text-primary)]">{routine.name}</h3>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {progress.completed}/{progress.total}
          </span>
        </div>
        <ProgressBar value={progress.percentage} size="sm" color="success" />
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-all">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">{routine.name}</h3>
            <RoutineLocationBadge location={routine.location} />
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{getDaysLabel()}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <span className="text-lg font-medium text-[var(--text-primary)]">
              {progress.percentage}%
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl z-20 min-w-[120px]">
                  <button
                    onClick={() => { setShowMenu(false); onEdit(); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDelete(); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-red-400 hover:bg-red-400/10 flex items-center gap-2"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-[var(--border-subtle)]">
        <ProgressBar value={progress.percentage} size="md" color="success" />
      </div>

      {/* Items */}
      <div className="p-2">
        {items.length === 0 ? (
          <p className="text-[12px] text-[var(--text-tertiary)] text-center py-4">
            No items in this routine
          </p>
        ) : (
          <div className="space-y-1">
            {items.map(item => {
              const completed = isItemCompleted(item.id)
              const isEditing = editingItemId === item.id
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-2 transition-colors',
                    completed && 'bg-[var(--success)]/5'
                  )}
                >
                  <button
                    onClick={() => onToggleItem(item.id)}
                    className={cn(
                      'w-5 h-5 border flex items-center justify-center transition-all flex-shrink-0',
                      completed
                        ? 'bg-[var(--success)] border-[var(--success)]'
                        : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                    )}
                  >
                    {completed && <Check size={12} className="text-[var(--bg-primary)]" />}
                  </button>

                  {isEditing ? (
                    <div
                      className="flex-1 flex items-center gap-2"
                      onBlur={(e) => {
                        const currentTarget = e.currentTarget
                        setTimeout(() => {
                          if (!currentTarget.contains(document.activeElement)) {
                            saveEditing()
                          }
                        }, 0)
                      }}
                    >
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing()
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        autoFocus
                        className="flex-1 bg-[var(--bg-tertiary)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
                      />
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                        <Clock size={10} />
                        <input
                          type="number"
                          min={1}
                          value={editingTargetTime}
                          onChange={(e) => setEditingTargetTime(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing()
                            if (e.key === 'Escape') cancelEditing()
                          }}
                          className="w-14 bg-[var(--bg-tertiary)] px-1 py-1 text-[11px] text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)] text-center"
                        />
                        m
                      </div>
                    </div>
                  ) : (
                    <span className={cn(
                      'flex-1 text-[13px]',
                      completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'
                    )}>
                      {item.title}
                    </span>
                  )}

                  {item.targetTime && (
                    <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                      <Clock size={10} />
                      {item.targetTime}m
                    </span>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(item)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                        title="Edit item"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-red-400"
                        title="Delete item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add item */}
        {showAddItem ? (
          <div className="flex items-center gap-2 p-2 mt-1">
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem()
                if (e.key === 'Escape') {
                  setShowAddItem(false)
                  setNewItemTitle('')
                }
              }}
              placeholder="New item..."
              autoFocus
              className="flex-1 bg-[var(--bg-tertiary)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
            />
            <button
              onClick={handleAddItem}
              disabled={!newItemTitle.trim()}
              className="px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddItem(true)}
            className="w-full p-2 mt-1 text-left text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
          >
            <Plus size={12} />
            Add item
          </button>
        )}
      </div>
    </div>
  )
}
