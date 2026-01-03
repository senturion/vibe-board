'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useTodos } from '@/hooks/useTodos'
import { TodoItem } from './TodoItem'

interface TodoListProps {
  compact?: boolean
}

export function TodoList({ compact = false }: TodoListProps) {
  const { todos, addTodo, toggleTodo, deleteTodo, updateTodo } = useTodos()
  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = () => {
    if (newText.trim()) {
      addTodo(newText.trim())
      setNewText('')
    }
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setNewText('')
      setIsAdding(false)
    }
  }

  const pendingCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  if (compact) {
    return (
      <div className="space-y-1">
        {todos.slice(0, 5).map((todo, index) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onUpdate={updateTodo}
            index={index}
            compact
          />
        ))}

        {todos.length === 0 && !isAdding && (
          <p className="text-[10px] text-[var(--text-tertiary)]">No tasks yet</p>
        )}

        {isAdding ? (
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            placeholder="Add task..."
            className="w-full bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)]"
          />
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            <Plus size={10} />
            Add task
          </button>
        )}

        {todos.length > 5 && (
          <p className="text-[9px] text-[var(--text-tertiary)]">
            +{todos.length - 5} more
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-lg text-[var(--text-primary)] italic">Quick Todos</h3>
          {pendingCount > 0 && (
            <span className="text-[11px] text-[var(--accent)]">{pendingCount}</span>
          )}
        </div>
        {completedCount > 0 && (
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            {completedCount} done
          </span>
        )}
      </div>

      {/* Decorative line */}
      <div className="h-px w-8 bg-[var(--accent)] mb-4" />

      {/* Todos List */}
      <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
        {todos.map((todo, index) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onUpdate={updateTodo}
            index={index}
          />
        ))}

        {todos.length === 0 && !isAdding && (
          <p className="py-6 text-[11px] text-[var(--text-tertiary)] italic">
            Nothing here yet...
          </p>
        )}
      </div>

      {/* Add Todo */}
      {isAdding ? (
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:italic outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="group mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <Plus size={12} className="group-hover:rotate-90 transition-transform duration-200" />
          Add todo
        </button>
      )}
    </div>
  )
}
