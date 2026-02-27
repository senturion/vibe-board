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
import { SettingsPanel } from '@/components/settings'
import { useNavigation } from '@/contexts/NavigationContext'
import { MainNav } from '@/components/navigation/MainNav'
import { BottomTabBar } from '@/components/navigation/BottomTabBar'
import { HabitsPage } from '@/components/habits/HabitsPage'
import { GoalsPage } from '@/components/goals/GoalsPage'
import { RoutinesPage } from '@/components/routines/RoutinesPage'
import { JournalPage } from '@/components/journal/JournalPage'
import { FocusPage, FocusBar, StopFocusPrompt } from '@/components/focus'
import { ActivityLog } from '@/components/activity/ActivityLog'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthGuard } from '@/components/AuthGuard'
import { useStaleTasks } from '@/hooks/useStaleTasks'
import { StaleTasksBanner } from '@/components/StaleTasksBanner'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useFocusTask } from '@/hooks/useFocusTask'

export default function Home() {
  const { activeView, setActiveView } = useNavigation()
  const {
    boards,
    activeBoard,
    activeBoardId,
    addBoard,
    updateBoard,
    deleteBoard,
    switchBoard,
  } = useBoards()

  const {
    tasks,
    moveTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useKanban(activeBoardId)

  const { isDark, setTheme, theme, mounted: themeMounted } = useTheme()
  const { colors: columnColors, setColumnColor, resetColors } = useColumnColors()

  // Focus timer (lifted from FocusPage so FocusBar can access it)
  const focusTimer = useFocusTimer()

  // Focus task state
  const {
    focusedTaskId,
    focusedTask,
    focusOnTask,
    requestStopFocus,
    confirmStopFocus,
    cancelStopFocus,
    showStopPrompt,
  } = useFocusTask({
    tasks,
    moveTask,
    linkToTask: focusTimer.linkToTask,
    clearLinks: focusTimer.clearLinks,
    stop: focusTimer.stop,
    isRunning: focusTimer.isRunning,
  })

  // Stale tasks banner — fetch all tasks across boards for staleness check
  const { tasks: allTasks, moveTask: moveAnyTask, updateTask: updateAnyTask } = useKanban()
  const { staleTasks: allStaleTasks, snoozeTask, snoozeAll } = useStaleTasks(allTasks, boards, updateAnyTask)
  const [staleBannerDismissed, setStaleBannerDismissed] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showDataManager, setShowDataManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
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
        return (
          <ErrorBoundary section="Habits">
            <HabitsPage />
          </ErrorBoundary>
        )
      case 'goals':
        return (
          <ErrorBoundary section="Goals">
            <GoalsPage />
          </ErrorBoundary>
        )
      case 'journal':
        return (
          <ErrorBoundary section="Journal">
            <JournalPage />
          </ErrorBoundary>
        )
      case 'routines':
        return (
          <ErrorBoundary section="Routines">
            <RoutinesPage />
          </ErrorBoundary>
        )
      case 'focus':
        return (
          <ErrorBoundary section="Focus">
            <FocusPage
              isRunning={focusTimer.isRunning}
              isPaused={focusTimer.isPaused}
              timeRemaining={focusTimer.timeRemaining}
              currentSessionType={focusTimer.currentSessionType}
              sessionsCompleted={focusTimer.sessionsCompleted}
              start={focusTimer.start}
              pause={focusTimer.pause}
              resume={focusTimer.resume}
              stop={focusTimer.stop}
              skip={focusTimer.skip}
              reset={focusTimer.reset}
              settings={focusTimer.settings}
              updateSettings={focusTimer.updateSettings}
              loading={focusTimer.loading}
              getTodaysFocusTime={focusTimer.getTodaysFocusTime}
              getWeeklyFocusTime={focusTimer.getWeeklyFocusTime}
              sessions={focusTimer.sessions}
              focusedTask={focusedTask}
              onUpdateTask={updateTask}
              onAddSubtask={addSubtask}
              onToggleSubtask={toggleSubtask}
              onDeleteSubtask={deleteSubtask}
              onStopFocus={requestStopFocus}
            />
          </ErrorBoundary>
        )
      case 'activity':
        return (
          <ErrorBoundary section="Activity">
            <ActivityLog />
          </ErrorBoundary>
        )
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
              <ErrorBoundary section="Board">
                <Board
                  boardId={activeBoardId}
                  searchOpen={searchOpen}
                  onSearchClose={() => setSearchOpen(false)}
                  filters={filters}
                  sort={sort}
                  compact={compact}
                  onFocusTask={focusOnTask}
                  focusedTaskId={focusedTaskId}
                  openTaskId={openTaskId}
                  onOpenTaskHandled={() => setOpenTaskId(null)}
                />
              </ErrorBoundary>
            </div>
          </>
        )
    }
  }

  return (
    <AuthGuard>
    <div className="flex h-screen flex-col lg:flex-row overflow-hidden bg-[var(--bg-primary)] theme-transition" style={{ paddingTop: 'var(--safe-area-top)', paddingLeft: 'var(--safe-area-left)', paddingRight: 'var(--safe-area-right)' }}>
      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 pb-[60px] lg:pb-0">
        {/* Header with Navigation */}
        <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-[var(--border-subtle)] theme-transition">
          {/* Left: Logo & Navigation */}
          <div className="flex items-center gap-4 sm:gap-6">
            <h1 className="font-display text-xl tracking-tight text-[var(--text-primary)]">
              <span className="italic">Vibe</span>
              <span className="text-[var(--accent)]">Board</span>
            </h1>
            <MainNav className="hidden lg:flex" />
          </div>

          <div />
        </header>

        {/* Stale Tasks Banner */}
        {!staleBannerDismissed && allStaleTasks.length > 0 && (
          <StaleTasksBanner
            staleTasks={allStaleTasks}
            boards={boards}
            onSnooze={snoozeTask}
            onSnoozeAll={snoozeAll}
            onDismiss={() => setStaleBannerDismissed(true)}
            onViewTask={(task) => {
              if (task.boardId) switchBoard(task.boardId)
              setActiveView('board')
              setOpenTaskId(task.id)
            }}
            onMoveTask={(taskId, column) => moveAnyTask(taskId, column)}
          />
        )}

        {/* Focus Bar — visible on all views except focus when a task is focused */}
        {focusedTask && activeView !== 'focus' && (
          <FocusBar
            task={focusedTask}
            timeRemaining={focusTimer.timeRemaining}
            isRunning={focusTimer.isRunning}
            isPaused={focusTimer.isPaused}
            onPause={focusTimer.pause}
            onResume={focusTimer.resume}
            onNavigateToFocus={() => setActiveView('focus')}
            onStopFocus={requestStopFocus}
          />
        )}

        {/* View Content */}
        {renderContent()}
      </main>

      <BottomTabBar onOpenSettings={() => setShowSettings(true)} />

      {/* Sidebar */}
      <ErrorBoundary section="Sidebar">
        <Sidebar />
      </ErrorBoundary>

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
        currentTheme={theme}
        onSetTheme={setTheme}
        compact={compact}
        onToggleCompact={() => setCompact(!compact)}
        columnColors={columnColors}
        onColumnColorChange={setColumnColor}
        onResetColors={resetColors}
      />

      {/* Stop Focus Prompt */}
      <StopFocusPrompt
        isOpen={showStopPrompt}
        onConfirm={confirmStopFocus}
        onCancel={cancelStopFocus}
      />
    </div>
    </AuthGuard>
  )
}
