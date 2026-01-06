'use client'

import { useState } from 'react'
import { Filter, SortAsc, X, Check, ChevronDown } from 'lucide-react'
import { Priority, PRIORITIES } from '@/lib/types'
import { useTagsContext } from '@/contexts/TagsContext'
import { cn } from '@/lib/utils'

export type SortOption = 'created' | 'due' | 'priority' | 'alpha'
export type DueDateFilter = 'all' | 'overdue' | 'due-soon' | 'no-date'

export interface FilterState {
  tags: string[]
  noTag: boolean
  priorities: Priority[]
  dueDate: DueDateFilter
}

export interface SortState {
  by: SortOption
  direction: 'asc' | 'desc'
}

interface FilterSortProps {
  filters: FilterState
  sort: SortState
  onFilterChange: (filters: FilterState) => void
  onSortChange: (sort: SortState) => void
  activeFilterCount: number
}

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'created', label: 'Date Created' },
  { id: 'due', label: 'Due Date' },
  { id: 'priority', label: 'Priority' },
  { id: 'alpha', label: 'Alphabetical' },
]

const DUE_DATE_OPTIONS: { id: DueDateFilter; label: string }[] = [
  { id: 'all', label: 'All Tasks' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due-soon', label: 'Due Soon' },
  { id: 'no-date', label: 'No Due Date' },
]

export function FilterSort({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  activeFilterCount,
}: FilterSortProps) {
  const { tags } = useTagsContext()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'filter' | 'sort'>('filter')

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter(t => t !== tagId)
      : [...filters.tags, tagId]
    onFilterChange({ ...filters, tags: newTags })
  }

  const toggleNoTag = () => {
    onFilterChange({ ...filters, noTag: !filters.noTag })
  }

  const togglePriority = (priority: Priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority]
    onFilterChange({ ...filters, priorities: newPriorities })
  }

  const setDueDateFilter = (dueDate: DueDateFilter) => {
    onFilterChange({ ...filters, dueDate })
  }

  const clearFilters = () => {
    onFilterChange({ tags: [], noTag: false, priorities: [], dueDate: 'all' })
  }

  const setSortOption = (by: SortOption) => {
    if (sort.by === by) {
      // Toggle direction
      onSortChange({ by, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ by, direction: 'desc' })
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-[12px] border transition-colors',
          activeFilterCount > 0
            ? 'text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent-glow)]'
            : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
        )}
      >
        <Filter size={14} />
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] bg-[var(--accent)] text-[var(--bg-primary)] font-medium">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[90vw] max-w-[320px] bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl shadow-black/30 z-30 animate-fade-up">
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)]">
              <button
                onClick={() => setActiveTab('filter')}
                className={cn(
                  'flex-1 px-4 py-3 text-[11px] uppercase tracking-[0.1em] transition-colors',
                  activeTab === 'filter'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
              >
                <Filter size={12} className="inline mr-2" />
                Filter
              </button>
              <button
                onClick={() => setActiveTab('sort')}
                className={cn(
                  'flex-1 px-4 py-3 text-[11px] uppercase tracking-[0.1em] transition-colors',
                  activeTab === 'sort'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
              >
                <SortAsc size={12} className="inline mr-2" />
                Sort
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {activeTab === 'filter' ? (
                <div className="space-y-5">
                  {/* Tags */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-3">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={toggleNoTag}
                        className={cn(
                          'px-2.5 py-1.5 text-[10px] uppercase tracking-[0.05em] font-medium transition-all border',
                          filters.noTag
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
                            : 'border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        )}
                      >
                        {filters.noTag && <Check size={10} className="inline mr-1" />}
                        No Tag
                      </button>
                      {tags.map(tag => {
                        const isActive = filters.tags.includes(tag.id)
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              'px-2.5 py-1.5 text-[10px] uppercase tracking-[0.05em] font-medium transition-all',
                              isActive
                                ? 'ring-1 ring-[var(--accent)]'
                                : 'opacity-60 hover:opacity-100'
                            )}
                            style={{ color: tag.color, backgroundColor: tag.bgColor }}
                          >
                            {isActive && <Check size={10} className="inline mr-1" />}
                            {tag.name}
                          </button>
                        )
                      })}
                    </div>
                    {tags.length === 0 && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-2">No tags yet.</p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-3">
                      Priority
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRIORITIES.map(priority => {
                        const isActive = filters.priorities.includes(priority.id)
                        return (
                          <button
                            key={priority.id}
                            onClick={() => togglePriority(priority.id)}
                            className={cn(
                              'px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] border transition-all',
                              isActive
                                ? 'border-[var(--accent)] bg-[var(--accent-glow)]'
                                : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
                            )}
                            style={{ color: priority.color }}
                          >
                            {isActive && <Check size={10} className="inline mr-1" />}
                            {priority.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-3">
                      Due Date
                    </label>
                    <div className="space-y-1">
                      {DUE_DATE_OPTIONS.map(option => (
                        <button
                          key={option.id}
                          onClick={() => setDueDateFilter(option.id)}
                          className={cn(
                            'w-full px-3 py-2 text-left text-[12px] flex items-center justify-between transition-colors',
                            filters.dueDate === option.id
                              ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                          )}
                        >
                          {option.label}
                          {filters.dueDate === option.id && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="w-full px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-red-400 border border-[var(--border)] hover:border-red-400/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <X size={12} />
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSortOption(option.id)}
                      className={cn(
                        'w-full px-3 py-2.5 text-left text-[12px] flex items-center justify-between transition-colors',
                        sort.by === option.id
                          ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      )}
                    >
                      {option.label}
                      {sort.by === option.id && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <SortAsc
                            size={12}
                            className={cn(
                              'transition-transform',
                              sort.direction === 'desc' && 'rotate-180'
                            )}
                          />
                          {sort.direction === 'asc' ? 'ASC' : 'DESC'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
