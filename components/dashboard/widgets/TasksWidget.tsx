'use client'

import { useState } from 'react'
import { CheckSquare, Check, Plus, ChevronRight } from 'lucide-react'
import { useTodos } from '@/hooks/useTodos'
import { useNavigation } from '@/contexts/NavigationContext'
import { cn } from '@/lib/utils'

export function TasksWidget() {
  const { todos, addTodo, toggleTodo, loading } = useTodos()
  const { setActiveView } = useNavigation()
  const [newTask, setNewTask] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Get today's tasks (created today or incomplete)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  const todaysTasks = todos.filter(t =>
    !t.completed || t.createdAt >= todayStart
  ).slice(0, 6)

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return

    await addTodo(newTask.trim())
    setNewTask('')
    setIsAdding(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading...</p>
      </div>
    )
  }

  const completedCount = todaysTasks.filter(t => t.completed).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={14} className="text-[var(--accent)]" />
          <span className="text-[12px] text-[var(--text-secondary)]">
            {completedCount}/{todaysTasks.length} done
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setActiveView('board')}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Add task form */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="mb-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a task..."
            autoFocus
            className="w-full px-2 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent)]"
          />
        </form>
      )}

      {/* Tasks list */}
      <div className="flex-1 overflow-auto space-y-1">
        {todaysTasks.length === 0 ? (
          <p className="text-[11px] text-[var(--text-tertiary)] text-center py-4">
            No tasks for today
          </p>
        ) : (
          todaysTasks.map(task => (
            <button
              key={task.id}
              onClick={() => toggleTodo(task.id)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors',
                task.completed
                  ? 'text-[var(--text-tertiary)]'
                  : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0',
                  task.completed
                    ? 'bg-[var(--success)] border-[var(--success)]'
                    : 'border-[var(--border)]'
                )}
              >
                {task.completed && <Check size={10} className="text-white" />}
              </div>
              <span className={cn('text-[11px] truncate', task.completed && 'line-through')}>
                {task.text}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
