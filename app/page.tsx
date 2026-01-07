'use client'

import { useState, useMemo } from 'react'
import { Board } from '@/components/kanban/Board'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Header } from '@/components/Header'
import { StatsDashboard } from '@/components/StatsDashboard'
import { DataManager } from '@/components/DataManager'
import { useBoards } from '@/hooks/useBoards'
import { useKanban } from '@/hooks/useKanban'
import { useTheme } from '@/hooks/useTheme'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useColumnColors } from '@/hooks/useColumnColors'
import { FilterState, SortState } from '@/components/FilterSort'
import { SettingsPanel } from '@/components/SettingsPanel'
import { useNavigation } from '@/contexts/NavigationContext'
import { MainNav, MobileNav } from '@/components/navigation/MainNav'
import { HabitsPage } from '@/components/habits/HabitsPage'
import { GoalsPage } from '@/components/goals/GoalsPage'
import { RoutinesPage } from '@/components/routines/RoutinesPage'
import { JournalPage } from '@/components/journal/JournalPage'
import { FocusPage } from '@/components/focus'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { Menu, X } from 'lucide-react'

export default function Home() {
  const { activeView } = useNavigation()
  const {
    boards,
    activeBoard,
    activeBoardId,
    addBoard,
    updateBoard,
    deleteBoard,
    switchBoard,
  } = useBoards()

  const { tasks } = useKanban(activeBoardId)
  const { isDark, toggleTheme, mounted: themeMounted } = useTheme()
  const { colors: columnColors, setColumnColor, resetColors } = useColumnColors()

  const [searchOpen, setSearchOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showDataManager, setShowDataManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [compact, setCompact] = useLocalStorage('vibe-compact-mode', false)

  // Filter & Sort state
  const [filters, setFilters] = useState<FilterState>({
    tags: [],
    noTag: false,
    priorities: [],
    dueDate: 'all',
  })
  const [sort, setSort] = useState<SortState>({
    by: 'created',
    direction: 'desc',
  })

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.tags.length > 0) count += filters.tags.length
    if (filters.noTag) count += 1
    if (filters.priorities.length > 0) count += filters.priorities.length
    if (filters.dueDate !== 'all') count += 1
    return count
  }, [filters])

  const handleImport = () => {
    // Data is already imported to localStorage, just reload
  }

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'habits':
        return <HabitsPage />
      case 'goals':
        return <GoalsPage />
      case 'journal':
        return <JournalPage />
      case 'routines':
        return <RoutinesPage />
      case 'focus':
        return <FocusPage />
      case 'activity':
        return <ActivityLog />
      case 'dashboard':
      case 'board':
      default:
        return (
          <>
            {/* Board Header with controls */}
            <Header
              boards={boards}
              activeBoard={activeBoard}
              onSwitchBoard={switchBoard}
              onAddBoard={addBoard}
              onDeleteBoard={deleteBoard}
              onUpdateBoard={updateBoard}
              onOpenSearch={() => setSearchOpen(true)}
              onOpenStats={() => setShowStats(true)}
              onOpenDataManager={() => setShowDataManager(true)}
              onOpenSettings={() => setShowSettings(true)}
              filters={filters}
              sort={sort}
              onFilterChange={setFilters}
              onSortChange={setSort}
              activeFilterCount={activeFilterCount}
            />
            {/* Board Area */}
            <div className="flex-1 overflow-hidden sm:overflow-auto">
              <Board
                boardId={activeBoardId}
                searchOpen={searchOpen}
                onSearchClose={() => setSearchOpen(false)}
                filters={filters}
                sort={sort}
                compact={compact}
              />
            </div>
          </>
        )
    }
  }

  return (
    <div className="flex h-screen flex-col lg:flex-row overflow-hidden bg-[var(--bg-primary)] theme-transition">
      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header with Navigation */}
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-[var(--border-subtle)] theme-transition">
          {/* Left: Logo & Navigation */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => setShowMobileNav((prev) => !prev)}
              className="lg:hidden p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
              aria-label={showMobileNav ? 'Close navigation' : 'Open navigation'}
            >
              {showMobileNav ? <X size={16} /> : <Menu size={16} />}
            </button>
            <h1 className="font-display text-xl tracking-tight text-[var(--text-primary)]">
              <span className="italic">Vibe</span>
              <span className="text-[var(--accent)]">Board</span>
            </h1>
            <MainNav className="hidden lg:flex" />
          </div>

          <div />
        </header>

        {showMobileNav && (
          <div className="lg:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
            <MobileNav className="px-4 py-3" onNavigate={() => setShowMobileNav(false)} />
          </div>
        )}

        {/* View Content */}
        {renderContent()}
      </main>

      {/* Sidebar */}
      <Sidebar />

      {/* Stats Dashboard */}
      <StatsDashboard
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        tasks={tasks}
      />

      {/* Data Manager */}
      <DataManager
        isOpen={showDataManager}
        onClose={() => setShowDataManager(false)}
        onImport={handleImport}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        compact={compact}
        onToggleCompact={() => setCompact(!compact)}
        columnColors={columnColors}
        onColumnColorChange={setColumnColor}
        onResetColors={resetColors}
      />
    </div>
  )
}
