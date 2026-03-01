import { Plus, Target, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'

export type ViewMode = 'today' | 'all' | 'analytics' | 'calendar'

interface HabitsHeaderProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  showMobileViewMenu: boolean
  setShowMobileViewMenu: (show: boolean) => void
  logDate: Date
  setLogDateKey: (key: string) => void
  onNewHabit: () => void
  onClearSelectedHabit: () => void
}

export function HabitsHeader({
  viewMode,
  setViewMode,
  showMobileViewMenu,
  setShowMobileViewMenu,
  logDate,
  setLogDateKey,
  onNewHabit,
  onClearSelectedHabit,
}: HabitsHeaderProps) {
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (mode !== 'analytics') onClearSelectedHabit()
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[var(--accent)]" />
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Habits</h1>
          </div>

          {/* Mobile view menu */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMobileViewMenu(!showMobileViewMenu)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] border border-[var(--border)] text-[var(--text-tertiary)]"
            >
              View: {viewMode === 'today' ? 'Today' : viewMode === 'all' ? 'All' : viewMode === 'calendar' ? 'Calendar' : 'Analytics'}
            </button>
            {showMobileViewMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMobileViewMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-[180px] bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl shadow-black/40 z-20">
                  {(['today', 'all', 'calendar', 'analytics'] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        handleViewChange(mode)
                        setShowMobileViewMenu(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-[12px] sm:text-[11px] uppercase tracking-[0.1em] transition-colors',
                        viewMode === mode
                          ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      )}
                    >
                      {mode === 'today' && 'Today'}
                      {mode === 'all' && 'All Habits'}
                      {mode === 'calendar' && 'Calendar'}
                      {mode === 'analytics' && 'Analytics'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop view tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] p-1 overflow-x-auto whitespace-nowrap max-w-[55vw] sm:max-w-none">
            {(['today', 'all', 'calendar', 'analytics'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewChange(mode)}
                className={cn(
                  'px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]',
                  viewMode === mode
                    ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
              >
                {mode === 'today' && 'Today'}
                {mode === 'all' && (
                  <>
                    <span className="sm:hidden">All</span>
                    <span className="hidden sm:inline">All Habits</span>
                  </>
                )}
                {mode === 'calendar' && (
                  <>
                    <CalendarDays size={12} />
                    <span className="sm:hidden">Cal</span>
                    <span className="hidden sm:inline">Calendar</span>
                  </>
                )}
                {mode === 'analytics' && (
                  <>
                    <span className="sm:hidden">Stats</span>
                    <span className="hidden sm:inline">Analytics</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop day nav */}
        {(viewMode === 'today' || viewMode === 'all') && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Day</span>
            <div className="flex items-center border border-[var(--border)] bg-[var(--bg-secondary)]">
              <button
                onClick={() => {
                  const prev = new Date(logDate)
                  prev.setDate(prev.getDate() - 1)
                  setLogDateKey(formatDateKey(prev))
                }}
                className="px-2 py-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                aria-label="Previous day"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-[12px] sm:text-[11px] text-[var(--text-secondary)]">
                {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  const next = new Date(logDate)
                  next.setDate(next.getDate() + 1)
                  setLogDateKey(formatDateKey(next))
                }}
                className="px-2 py-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                aria-label="Next day"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onNewHabit}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] sm:text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Habit</span>
        </button>
      </div>

      {/* Mobile day nav */}
      {(viewMode === 'today' || viewMode === 'all') && (
        <div className="px-4 pb-3 sm:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Day</span>
            <div className="flex items-center border border-[var(--border)] bg-[var(--bg-secondary)]">
              <button
                onClick={() => {
                  const prev = new Date(logDate)
                  prev.setDate(prev.getDate() - 1)
                  setLogDateKey(formatDateKey(prev))
                }}
                className="px-2 py-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                aria-label="Previous day"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-[12px] sm:text-[11px] text-[var(--text-secondary)]">
                {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button
                onClick={() => {
                  const next = new Date(logDate)
                  next.setDate(next.getDate() + 1)
                  setLogDateKey(formatDateKey(next))
                }}
                className="px-2 py-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                aria-label="Next day"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
