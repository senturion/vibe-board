'use client'

import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, X, Clock } from 'lucide-react'
import { KanbanTask, LABELS, COLUMNS, KanbanColumn, isOverdue, isDueSoon } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SearchProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string) => KanbanTask[]
  onSelectTask: (task: KanbanTask) => void
  columns?: KanbanColumn[]
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--text-tertiary)',
  medium: 'var(--text-secondary)',
  high: 'var(--accent)',
  urgent: '#ef4444',
}

export function Search({ isOpen, onClose, onSearch, onSelectTask, columns = COLUMNS }: SearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KanbanTask[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const syncTimeout = setTimeout(() => {
        setQuery('')
        setResults([])
        setSelectedIndex(0)
        setTimeout(() => inputRef.current?.focus(), 0)
      }, 0)

      return () => clearTimeout(syncTimeout)
    }
  }, [isOpen])

  useEffect(() => {
    const syncTimeout = setTimeout(() => {
      if (query.trim()) {
        const searchResults = onSearch(query)
        setResults(searchResults)
        setSelectedIndex(0)
      } else {
        setResults([])
      }
    }, 0)

    return () => clearTimeout(syncTimeout)
  }, [query, onSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      onSelectTask(results[selectedIndex])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tasks"
        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 animate-fade-up"
      >
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
            <SearchIcon size={18} className="text-[var(--text-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results.length > 0 ? `search-result-${selectedIndex}` : undefined}
              aria-autocomplete="list"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks..."
              className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div id="search-results" role="listbox" aria-label="Search results" className="max-h-[50vh] overflow-y-auto py-2">
              {results.map((task, index) => {
                const column = columns.find(c => c.id === task.column)
                const taskLabels = LABELS.filter(l => (task.labels || []).includes(l.id))
                const priorityColor = PRIORITY_COLORS[task.priority || 'medium']
                const hasDueDate = !!task.dueDate
                const overdue = hasDueDate && isOverdue(task.dueDate!)
                const dueSoon = hasDueDate && !overdue && isDueSoon(task.dueDate!)

                return (
                  <button
                    key={task.id}
                    id={`search-result-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => {
                      onSelectTask(task)
                      onClose()
                    }}
                    className={cn(
                      'w-full px-5 py-3 text-left hover:bg-[var(--bg-tertiary)] transition-colors',
                      index === selectedIndex && 'bg-[var(--bg-tertiary)]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Priority indicator */}
                      <div
                        className="w-1 h-full min-h-[40px] shrink-0 mt-0.5"
                        style={{ backgroundColor: priorityColor }}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed truncate">
                          {task.title}
                        </p>

                        <div className="flex items-center gap-3 mt-1.5">
                          {/* Column badge */}
                          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                            {column?.title || task.column}
                          </span>

                          {/* Labels */}
                          {taskLabels.length > 0 && (
                            <div className="flex items-center gap-1">
                              {taskLabels.slice(0, 2).map(label => (
                                <span
                                  key={label.id}
                                  className="px-1 py-0.5 text-[8px] uppercase tracking-[0.05em]"
                                  style={{ color: label.color, backgroundColor: label.bg }}
                                >
                                  {label.label}
                                </span>
                              ))}
                              {taskLabels.length > 2 && (
                                <span className="text-[10px] text-[var(--text-tertiary)]">
                                  +{taskLabels.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Due date */}
                          {hasDueDate && (
                            <span
                              className={cn(
                                'flex items-center gap-1 text-[10px]',
                                overdue && 'text-red-400',
                                dueSoon && 'text-amber-400',
                                !overdue && !dueSoon && 'text-[var(--text-tertiary)]'
                              )}
                            >
                              <Clock size={9} />
                              {new Date(task.dueDate!).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* No results */}
          {query && results.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-[12px] text-[var(--text-tertiary)]">
                No tasks found for &quot;{query}&quot;
              </p>
            </div>
          )}

          {/* Hint */}
          {!query && (
            <div className="px-5 py-6 text-center">
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Type to search across all tasks
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] border border-[var(--border)] mx-0.5">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] border border-[var(--border)] mx-0.5">↓</kbd>
              to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] border border-[var(--border)] mx-0.5">Enter</kbd>
              to select
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
