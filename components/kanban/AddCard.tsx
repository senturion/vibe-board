'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { ColumnId, Priority } from '@/lib/types'

interface AddCardProps {
  columnId: ColumnId
  onAdd: (title: string, columnId: ColumnId, priority: Priority) => void
}

export function AddCard({ columnId, onAdd }: AddCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim(), columnId, 'medium')
      setTitle('')
      // Keep editing mode open for quick sequential adds
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setTitle('')
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    if (!title.trim()) {
      setIsEditing(false)
    }
  }

  return (
    <div
      onClick={() => !isEditing && setIsEditing(true)}
      className="group relative bg-[var(--bg-secondary)]/50 border-l-2 border-[var(--border)] cursor-text transition-all duration-150 hover:bg-[var(--bg-secondary)]/80"
    >
      <div className="p-4 pl-3">
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="What needs to be done?"
            rows={1}
            className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none leading-relaxed"
            style={{ minHeight: '20px' }}
          />
        ) : (
          <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <Plus size={14} className="opacity-60" />
            <span className="text-[13px] opacity-60">New task...</span>
          </div>
        )}
      </div>
    </div>
  )
}
