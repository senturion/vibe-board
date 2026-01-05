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
import { MainNav } from '@/components/navigation/MainNav'
import { HabitsPage } from '@/components/habits/HabitsPage'
import { GoalsPage } from '@/components/goals/GoalsPage'
import { RoutinesPage } from '@/components/routines/RoutinesPage'
import { JournalPage } from '@/components/journal/JournalPage'
import { FocusPage } from '@/components/focus'
import { ActivityLog } from '@/components/activity/ActivityLog'

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
  const [compact, setCompact] = useLocalStorage('vibe-compact-mode', false)

  // Filter & Sort state
  const [filters, setFilters] = useState<FilterState>({
    labels: [],
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
    if (filters.labels.length > 0) count += filters.labels.length
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
            {/* Editorial Subheader */}
            <div className="relative px-8 py-4 border-b border-[var(--border-subtle)] theme-transition">
              <div className="flex items-end justify-between gap-8">
                <div className="animate-fade-up">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">
                    Current Board
                  </p>
                  <h2 className="font-display text-2xl text-[var(--text-primary)] tracking-tight leading-none italic">
                    {activeBoard.name}
                  </h2>
                </div>
                <div className="animate-fade-up flex items-center gap-6 pb-1" style={{ animationDelay: '0.1s', opacity: 0 }}>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Today</p>
                    <p className="text-sm text-[var(--text-secondary)] font-light">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-[var(--border)]" />
                  <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" title="Synced locally" />
                </div>
              </div>

              {/* Decorative line */}
              <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-[var(--accent)] via-[var(--border)] to-transparent" />
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-auto">
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
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)] theme-transition">
      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Navigation */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[var(--border-subtle)] theme-transition">
          {/* Left: Logo & Navigation */}
          <div className="flex items-center gap-6">
            <h1 className="font-display text-xl tracking-tight text-[var(--text-primary)]">
              <span className="italic">Vibe</span>
              <span className="text-[var(--accent)]">Board</span>
            </h1>
            <MainNav />
          </div>

          <div />
        </header>

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
