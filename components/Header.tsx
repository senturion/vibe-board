'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Plus, Trash2, Check, X, Edit2, BarChart3, Database } from 'lucide-react'
import { Board } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'
import { FilterSort, FilterState, SortState } from './FilterSort'

interface HeaderProps {
  boards: Board[]
  activeBoard: Board
  onSwitchBoard: (id: string) => void
  onAddBoard: (name: string) => void
  onDeleteBoard: (id: string) => void
  onUpdateBoard: (id: string, updates: Partial<Board>) => void
  onOpenSearch: () => void
  onOpenStats: () => void
  onOpenDataManager: () => void
  filters: FilterState
  sort: SortState
  onFilterChange: (filters: FilterState) => void
  onSortChange: (sort: SortState) => void
  activeFilterCount: number
  isDark: boolean
  onToggleTheme: () => void
  themeMounted: boolean
}

export function Header({
  boards,
  activeBoard,
  onSwitchBoard,
  onAddBoard,
  onDeleteBoard,
  onUpdateBoard,
  onOpenSearch,
  onOpenStats,
  onOpenDataManager,
  filters,
  sort,
  onFilterChange,
  onSortChange,
  activeFilterCount,
  isDark,
  onToggleTheme,
  themeMounted,
}: HeaderProps) {
  const [showBoardMenu, setShowBoardMenu] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      onAddBoard(newBoardName.trim())
      setNewBoardName('')
      setIsCreating(false)
      setShowBoardMenu(false)
    }
  }

  const handleStartEdit = (board: Board) => {
    setEditingId(board.id)
    setEditName(board.name)
  }

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdateBoard(editingId, { name: editName.trim() })
    }
    setEditingId(null)
    setEditName('')
  }

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-[var(--border-subtle)] theme-transition">
      {/* Left: Logo & Board Selector */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <h1 className="font-display text-xl tracking-tight text-[var(--text-primary)]">
          <span className="italic">Vibe</span>
          <span className="text-[var(--accent)]">Board</span>
        </h1>

        {/* Board Selector */}
        <div className="relative">
          <button
            onClick={() => setShowBoardMenu(!showBoardMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <span className="max-w-[150px] truncate">{activeBoard.name}</span>
            <ChevronDown size={14} className={cn(
              'transition-transform',
              showBoardMenu && 'rotate-180'
            )} />
          </button>

          {showBoardMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => {
                setShowBoardMenu(false)
                setIsCreating(false)
                setEditingId(null)
              }} />
              <div className="absolute left-0 top-full mt-2 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20 min-w-[200px]">
                {/* Board List */}
                <div className="py-1">
                  {boards.map(board => (
                    <div key={board.id} className="group relative">
                      {editingId === board.id ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit()
                              if (e.key === 'Escape') {
                                setEditingId(null)
                                setEditName('')
                              }
                            }}
                            className="flex-1 bg-[var(--bg-tertiary)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none border border-[var(--border)]"
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-[var(--text-tertiary)] hover:text-green-400 transition-colors"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null)
                              setEditName('')
                            }}
                            className="p-1 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            onSwitchBoard(board.id)
                            setShowBoardMenu(false)
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-[12px] flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer',
                            board.id === activeBoard.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                          )}
                        >
                          <span className="truncate">{board.name}</span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartEdit(board)
                              }}
                              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <Edit2 size={10} />
                            </button>
                            {boards.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteBoard(board.id)
                                }}
                                className="p-1 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-[var(--border)]" />

                {/* Create New */}
                {isCreating ? (
                  <div className="p-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateBoard()
                        if (e.key === 'Escape') {
                          setIsCreating(false)
                          setNewBoardName('')
                        }
                      }}
                      placeholder="Board name..."
                      className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setIsCreating(false)
                          setNewBoardName('')
                        }}
                        className="px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateBoard}
                        disabled={!newBoardName.trim()}
                        className="px-2 py-1 text-[10px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50 transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                  >
                    <Plus size={12} />
                    New Board
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Filter & Sort */}
        <FilterSort
          filters={filters}
          sort={sort}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
          activeFilterCount={activeFilterCount}
        />

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-[var(--bg-tertiary)] border border-[var(--border)]">/</kbd>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border)]" />

        {/* Stats */}
        <button
          onClick={onOpenStats}
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          title="View statistics"
        >
          <BarChart3 size={14} />
        </button>

        {/* Data Manager */}
        <button
          onClick={onOpenDataManager}
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          title="Export/Import data"
        >
          <Database size={14} />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle
          isDark={isDark}
          onToggle={onToggleTheme}
          mounted={themeMounted}
        />
      </div>
    </header>
  )
}
