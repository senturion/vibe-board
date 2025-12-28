'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { TodoItem as TodoItemType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TodoItemProps {
  todo: TodoItemType
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, text: string) => void
  index?: number
}

export function TodoItem({ todo, onToggle, onDelete, onUpdate, index = 0 }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmit = () => {
    if (editText.trim()) {
      onUpdate(todo.id, editText.trim())
    } else {
      setEditText(todo.text)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setEditText(todo.text)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 py-2 px-2 -mx-2 rounded transition-colors',
        'hover:bg-[var(--bg-tertiary)]'
      )}
    >
      {/* Custom Checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        className={cn(
          'mt-0.5 w-4 h-4 border flex items-center justify-center shrink-0 transition-all duration-200',
          todo.completed
            ? 'bg-[var(--accent)] border-[var(--accent)]'
            : 'border-[var(--text-tertiary)] hover:border-[var(--text-secondary)]'
        )}
      >
        {todo.completed && <Check size={10} className="text-[var(--bg-primary)]" strokeWidth={3} />}
      </button>

      {/* Text */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none min-w-0"
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className={cn(
            'flex-1 text-[13px] cursor-default select-none leading-relaxed',
            todo.completed
              ? 'text-[var(--text-tertiary)] line-through decoration-[var(--text-tertiary)]'
              : 'text-[var(--text-primary)]'
          )}
        >
          {todo.text}
        </span>
      )}

      {/* Delete Button */}
      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 p-1 -m-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all duration-150"
      >
        <X size={12} />
      </button>
    </div>
  )
}
