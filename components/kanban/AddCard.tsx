'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Flag } from 'lucide-react'
import { ColumnId, Priority, PRIORITIES } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddCardProps {
  columnId: ColumnId
  onAdd: (title: string, columnId: ColumnId, priority: Priority) => void
}

export function AddCard({ columnId, onAdd }: AddCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim(), columnId, priority)
      setTitle('')
      setPriority('medium')
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setTitle('')
      setPriority('medium')
      setIsAdding(false)
    }
  }

  const selectedPriority = PRIORITIES.find(p => p.id === priority)!

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="group flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-200" />
        <span className="uppercase tracking-[0.1em]">Add task</span>
      </button>
    )
  }

  return (
    <div className="bg-[var(--bg-secondary)] border-l-2 border-[var(--accent)]">
      <div className="p-4">
        <textarea
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to be done?"
          rows={2}
          className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none leading-relaxed"
        />

        {/* Priority and actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
          {/* Priority selector */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] hover:opacity-80 transition-opacity"
              style={{ color: selectedPriority.color }}
            >
              <Flag size={10} fill={priority === 'urgent' || priority === 'high' ? selectedPriority.color : 'none'} />
              {selectedPriority.label}
            </button>

            {showPriorityMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowPriorityMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-1 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[100px]">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPriority(p.id)
                        setShowPriorityMenu(false)
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-[11px] uppercase tracking-[0.1em] flex items-center gap-2 hover:bg-[var(--bg-tertiary)] transition-colors',
                        priority === p.id && 'bg-[var(--bg-tertiary)]'
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

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTitle('')
                setPriority('medium')
                setIsAdding(false)
              }}
              className="px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-4 py-1.5 text-[11px] uppercase tracking-[0.1em] font-medium bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
