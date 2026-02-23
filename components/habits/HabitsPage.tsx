'use client'

import { useState, useMemo } from 'react'
import { Plus, BarChart3, Calendar, Target, Flame, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useHabitAnalytics, useAllHabitsAnalytics } from '@/hooks/useHabitAnalytics'
import { useSettings } from '@/hooks/useSettings'
import { useTemporalView } from '@/hooks/useTemporalView'
import { Habit, formatDateKey, parseDateKey, HabitCompletion, DayOfWeek, getWeekStart } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/Progress'
import { EmptyState, LoadingState } from '@/components/ui/EmptyState'
import { StreakBadge, StatBadge } from '@/components/ui/Badge'
import { HabitCard } from './HabitCard'
import { HabitEditor } from './HabitEditor'
import { HabitHeatmap } from './HabitHeatmap'
import { HabitIcon } from './IconPicker'
import { TemporalNav, DayView, WeekView, MonthView } from '@/components/temporal'

type ViewMode = 'today' | 'all' | 'analytics' | 'calendar'

export function HabitsPage() {
  const {
    habits,
    categories,
    completions,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    archiveHabit,
    toggleHabit,
    getCompletionStatus,
    getStreak,
  } = useHabits()

  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [showMobileViewMenu, setShowMobileViewMenu] = useState(false)
  const [logDateKey, setLogDateKey] = useState(formatDateKey())
  const [showEditor, setShowEditor] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const [selectedHabitForStats, setSelectedHabitForStats] = useState<Habit | undefined>()

  const { weeklyStats, weeklyTrend, trend } = useAllHabitsAnalytics(habits, completions)
  const { settings } = useSettings()
  const temporal = useTemporalView('habits')

  const logDate = useMemo(() => parseDateKey(logDateKey), [logDateKey])
  const isLogDateToday = logDateKey === formatDateKey(new Date())

  const activeHabitsForDate = useMemo(() => {
    const day = logDate.getDay()
    const dayOfWeek = (day === 0 ? 7 : day) as DayOfWeek

    return habits.filter(habit => {
      if (!habit.isActive) return false
      switch (habit.frequencyType) {
        case 'daily':
          return true
        case 'specific_days':
          return habit.specificDays?.includes(dayOfWeek) ?? false
        case 'weekly':
          return true
        default:
          return false
      }
    })
  }, [habits, logDate])

  const dayStats = useMemo(() => {
    let completed = 0
    const total = activeHabitsForDate.length

    activeHabitsForDate.forEach(habit => {
      if (getCompletionStatus(habit.id, logDate).isComplete) {
        completed++
      }
    })

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [activeHabitsForDate, getCompletionStatus, logDate])

  // Helper to get completion date from a completion record
  const getCompletionDate = (completion: HabitCompletion) => completion.completionDate

  const selectedHabitStreak = selectedHabitForStats ? getStreak(selectedHabitForStats.id) : undefined
  const selectedHabitAnalytics = useHabitAnalytics({
    habit: selectedHabitForStats,
    completions,
    streak: selectedHabitStreak ? { current: selectedHabitStreak.currentStreak, best: selectedHabitStreak.bestStreak } : undefined,
  })

  const completionsByDate = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    completions.forEach(c => {
      if (!map.has(c.completionDate)) {
        map.set(c.completionDate, new Map())
      }
      const dayMap = map.get(c.completionDate)!
      dayMap.set(c.habitId, (dayMap.get(c.habitId) || 0) + c.count)
    })
    return map
  }, [completions])

  const mostImprovedHabits = useMemo(() => {
    const activeHabits = habits.filter(h => h.isActive)
    if (activeHabits.length === 0) return []

    const today = new Date()
    const start = getWeekStart(today, settings.weekStartsOn)
    const weekStarts = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() - (7 * (7 - i)))
      return d
    })

    const getWeeklyRate = (habit: Habit, weekStart: Date) => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      let completed = 0
      let total = 0

      if (habit.frequencyType === 'weekly') {
        const weeklyTarget = Math.max(habit.frequencyValue || 1, 1)
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const dateKey = formatDateKey(new Date(d))
          const count = completionsByDate.get(dateKey)?.get(habit.id) || 0
          if (count >= habit.targetCount) {
            completed++
          }
        }
        total = weeklyTarget
        return total > 0 ? Math.round((Math.min(completed, total) / total) * 100) : 0
      }

      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay()
        if (habit.frequencyType === 'specific_days' && !habit.specificDays?.includes(dayOfWeek as 1|2|3|4|5|6|7)) {
          continue
        }
        total++
        const dateKey = formatDateKey(new Date(d))
        const count = completionsByDate.get(dateKey)?.get(habit.id) || 0
        if (count >= habit.targetCount) {
          completed++
        }
      }

      return total > 0 ? Math.round((completed / total) * 100) : 0
    }

    return activeHabits.map(habit => {
      const rates = weekStarts.map(ws => getWeeklyRate(habit, ws))
      const prev = rates.slice(0, 4)
      const recent = rates.slice(4)
      const prevAvg = prev.reduce((sum, r) => sum + r, 0) / Math.max(prev.length, 1)
      const recentAvg = recent.reduce((sum, r) => sum + r, 0) / Math.max(recent.length, 1)
      const improvement = Math.round(recentAvg - prevAvg)
      return { habit, improvement, recentAvg: Math.round(recentAvg), prevAvg: Math.round(prevAvg) }
    })
      .filter(item => item.improvement > 0)
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 4)
  }, [habits, completionsByDate, settings.weekStartsOn])

  const handleSaveHabit = async (habitData: Omit<Habit, 'id' | 'createdAt' | 'order'>) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, habitData)
    } else {
      await addHabit(habitData)
    }
    setEditingHabit(undefined)
    setShowEditor(false)
  }

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit)
    setShowEditor(true)
  }

  const handleViewStats = (habit: Habit) => {
    setSelectedHabitForStats(habit)
    setViewMode('analytics')
  }

  if (loading) {
    return <LoadingState message="Loading habits..." />
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[var(--accent)]" />
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Habits</h1>
          </div>

          {/* View mode tabs */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMobileViewMenu((prev) => !prev)}
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
                        setViewMode(mode)
                        if (mode !== 'analytics') setSelectedHabitForStats(undefined)
                        setShowMobileViewMenu(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors',
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

          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] p-1 overflow-x-auto whitespace-nowrap max-w-[55vw] sm:max-w-none">
            {(['today', 'all', 'calendar', 'analytics'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode)
                  if (mode !== 'analytics') setSelectedHabitForStats(undefined)
                }}
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
              <span className="px-2 text-[11px] text-[var(--text-secondary)]">
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
          onClick={() => {
            setEditingHabit(undefined)
            setShowEditor(true)
          }}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] sm:text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Habit</span>
        </button>
      </div>
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
              <span className="px-2 text-[11px] text-[var(--text-secondary)]">
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

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 p-4 sm:p-6">
        {viewMode === 'today' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Today's Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={dayStats.percentage}
                    size={60}
                    strokeWidth={5}
                    color="var(--success)"
                  />
                  <div>
                    <p className="text-2xl font-medium text-[var(--text-primary)]">
                      {dayStats.completed}/{dayStats.total}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                      {isLogDateToday ? 'Today' : 'Day'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-4">
                  <div className="w-[60px] h-[60px] flex items-center justify-center bg-[var(--accent-glow)] border border-[var(--accent-muted)]">
                    <Flame size={24} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-medium text-[var(--text-primary)]">
                      {Math.max(...habits.map(h => getStreak(h.id)?.bestStreak || 0), 0)}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                      Best Streak
                    </p>
                  </div>
                </div>
              </Card>

              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={weeklyStats.percentage}
                    size={60}
                    strokeWidth={5}
                    color="var(--chart-2)"
                  />
                  <div>
                    <p className="text-2xl font-medium text-[var(--text-primary)]">
                      {weeklyStats.percentage}%
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                      This Week
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Today's Habits */}
            <Card variant="bordered" padding="none">
              <CardHeader className="px-4 pt-4">
                <CardTitle>
                  {isLogDateToday
                    ? "Today's Habits"
                    : `Habits for ${logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeHabitsForDate.length === 0 ? (
                  <EmptyState
                    icon="habits"
                    title={isLogDateToday ? 'No habits for today' : 'No habits for this day'}
                    description="Create your first habit to start tracking"
                    action={{
                      label: 'Create Habit',
                      onClick: () => setShowEditor(true),
                    }}
                    size="sm"
                  />
                ) : (
                  <div className="space-y-2 p-4 pt-0">
                    {activeHabitsForDate.map((habit) => {
                      const status = getCompletionStatus(habit.id, logDate)
                      const streak = getStreak(habit.id)
                      return (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          completionStatus={{ completed: status.isComplete, count: status.count, target: status.target }}
                          streak={{ current: streak?.currentStreak || 0, best: streak?.bestStreak || 0 }}
                          onToggle={() => toggleHabit(habit.id, logDate)}
                          onEdit={() => handleEdit(habit)}
                          onDelete={() => deleteHabit(habit.id)}
                          onArchive={() => archiveHabit(habit.id)}
                          onViewStats={() => handleViewStats(habit)}
                          showRisk={isLogDateToday}
                        />
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'all' && (
          <div className="max-w-3xl mx-auto">
            {habits.length === 0 ? (
              <EmptyState
                icon="habits"
                title="No habits yet"
                description="Create habits to track your daily routines and build consistency"
                action={{
                  label: 'Create Habit',
                  onClick: () => setShowEditor(true),
                }}
              />
            ) : (
              <div className="space-y-3">
                {habits.map((habit) => {
                  const status = getCompletionStatus(habit.id, logDate)
                  const streak = getStreak(habit.id)
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      completionStatus={{ completed: status.isComplete, count: status.count, target: status.target }}
                      streak={{ current: streak?.currentStreak || 0, best: streak?.bestStreak || 0 }}
                      onToggle={() => toggleHabit(habit.id, logDate)}
                      onEdit={() => handleEdit(habit)}
                      onDelete={() => deleteHabit(habit.id)}
                      onArchive={() => archiveHabit(habit.id)}
                      onViewStats={() => handleViewStats(habit)}
                      showRisk={isLogDateToday}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="h-full flex flex-col -m-6">
            {/* Temporal Navigation */}
            <TemporalNav
              mode={temporal.mode}
              onModeChange={temporal.setMode}
              dateLabel={temporal.dateLabel}
              onPrev={temporal.goToPrev}
              onNext={temporal.goToNext}
              onToday={temporal.goToToday}
              isToday={temporal.isToday}
              showListMode={false}
            />

            {/* Temporal View Content */}
            {temporal.mode === 'day' && (
              <DayView
                date={temporal.currentDate}
                items={completions}
                getItemDate={getCompletionDate}
                emptyMessage="No habits completed on this day"
                renderItem={(completion) => {
                  const habit = habits.find(h => h.id === completion.habitId)
                  if (!habit) return null
                  return (
                    <div
                      className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded"
                      style={{ borderLeft: `3px solid ${habit.color}` }}
                    >
                      <div
                        className="w-6 h-6 flex items-center justify-center"
                        style={{ color: habit.color }}
                      >
                        <HabitIcon name={habit.icon || 'target'} size={16} color={habit.color} />
                      </div>
                      <span className="text-sm text-[var(--text-primary)]">{habit.name}</span>
                      {completion.count > 1 && (
                        <span className="text-xs text-[var(--text-tertiary)]">×{completion.count}</span>
                      )}
                    </div>
                  )
                }}
              />
            )}

            {temporal.mode === 'week' && (
              <WeekView
                startDate={temporal.dateRange.start}
                items={completions}
                getItemDate={getCompletionDate}
                onDayClick={(date) => {
                  temporal.setCurrentDate(date)
                  temporal.setMode('day')
                }}
                renderItem={(completion) => {
                  const habit = habits.find(h => h.id === completion.habitId)
                  if (!habit) return null
                  return (
                    <div
                      className="px-1.5 py-0.5 rounded text-[10px] truncate flex items-center gap-1"
                      style={{ backgroundColor: habit.color + '20', color: habit.color }}
                    >
                      <HabitIcon name={habit.icon || 'target'} size={10} color={habit.color} />
                      {habit.name}
                    </div>
                  )
                }}
              />
            )}

            {temporal.mode === 'month' && (
              <MonthView
                year={temporal.currentDate.getFullYear()}
                month={temporal.currentDate.getMonth()}
                items={completions}
                getItemDate={getCompletionDate}
                selectedDate={temporal.currentDate}
                onDayClick={(date) => {
                  temporal.setCurrentDate(date)
                  temporal.setMode('day')
                }}
                renderDayContent={(date, dayCompletions) => {
                  // Get all active habits for this date
                  const activeForDay = habits.filter(h => {
                    if (!h.isActive) return false
                    if (h.frequencyType === 'daily') return true
                    if (h.frequencyType === 'specific_days') {
                      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
                      return h.specificDays?.includes(dayOfWeek as DayOfWeek) ?? false
                    }
                    return true
                  })

                  if (activeForDay.length === 0) return null

                  // Build completion set for this day
                  const completedHabitIds = new Set<string>()
                  activeForDay.forEach(h => {
                    if (h.habitType === 'avoid' && h.trackingMode === 'auto-complete') {
                      // No completion record = success
                      const hasSlip = dayCompletions.some(c => c.habitId === h.id)
                      if (!hasSlip) completedHabitIds.add(h.id)
                    } else {
                      const total = dayCompletions
                        .filter(c => c.habitId === h.id)
                        .reduce((sum, c) => sum + c.count, 0)
                      if (total >= h.targetCount) completedHabitIds.add(h.id)
                    }
                  })

                  const displayHabits = activeForDay.slice(0, 4)
                  const overflow = activeForDay.length - 4
                  const allComplete = activeForDay.every(h => completedHabitIds.has(h.id))
                  const noneComplete = activeForDay.every(h => !completedHabitIds.has(h.id))
                  const isPast = date < new Date(new Date().toDateString())

                  return (
                    <div className={cn(
                      'space-y-0.5',
                      allComplete && 'border-l-2 border-[var(--success)] -ml-1 pl-0.5',
                      !allComplete && noneComplete && isPast && 'border-l-2 border-red-400/30 -ml-1 pl-0.5'
                    )}>
                      <div className="flex flex-wrap gap-0.5">
                        {displayHabits.map(h => (
                          <HabitIcon
                            key={h.id}
                            name={h.icon || 'target'}
                            size={12}
                            color={h.color}
                            className={cn(
                              'transition-opacity',
                              completedHabitIds.has(h.id) ? 'opacity-100' : 'opacity-30'
                            )}
                          />
                        ))}
                      </div>
                      {overflow > 0 && (
                        <div className="text-[8px] text-[var(--text-tertiary)]">
                          +{overflow}
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            )}
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Habit selector */}
            <Card variant="bordered" padding="md">
              <CardHeader>
                <CardTitle>Select Habit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {habits.map((habit) => (
                    <button
                      key={habit.id}
                      onClick={() => setSelectedHabitForStats(habit)}
                      className={cn(
                        'px-3 py-2 text-[12px] border transition-colors',
                        selectedHabitForStats?.id === habit.id
                          ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                      )}
                    >
                      {habit.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedHabitForStats ? (
              <>
                {/* Stats overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatBadge
                    value={selectedHabitAnalytics.stats.totalCompletions}
                    label={selectedHabitForStats.habitType === 'avoid' && selectedHabitForStats.trackingMode === 'auto-complete' ? 'Total Slips' : 'Total Completions'}
                    icon="target"
                  />
                  <StatBadge
                    value={`${selectedHabitAnalytics.stats.completionRate}%`}
                    label={selectedHabitForStats.habitType === 'avoid' && selectedHabitForStats.trackingMode === 'auto-complete' ? 'Success Rate' : 'Completion Rate'}
                    icon="zap"
                  />
                  <StatBadge
                    value={selectedHabitAnalytics.stats.currentStreak}
                    label="Current Streak"
                    icon="star"
                    variant="accent"
                  />
                  <StatBadge
                    value={selectedHabitAnalytics.stats.bestStreak}
                    label="Best Streak"
                    icon="trophy"
                  />
                </div>

                {/* Heatmap */}
                <Card variant="bordered" padding="md">
                  <CardHeader>
                    <CardTitle>
                      <Calendar size={14} className="mr-2 inline" />
                      Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HabitHeatmap data={selectedHabitAnalytics.heatmapData} />
                  </CardContent>
                </Card>

                {/* Weekly completion chart */}
                <Card variant="bordered" padding="md">
                  <CardHeader>
                    <CardTitle>
                      <BarChart3 size={14} className="mr-2 inline" />
                      {selectedHabitForStats.habitType === 'avoid' && selectedHabitForStats.trackingMode === 'auto-complete' ? 'Weekly Success Rate' : 'Weekly Completion Rate'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedHabitAnalytics.completionRateByWeek.map((week, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-12 text-[11px] text-[var(--text-tertiary)]">
                            {week.week}
                          </span>
                          <div className="flex-1 h-4 bg-[var(--bg-tertiary)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--success)] animate-bar-grow"
                              style={{
                                width: `${week.rate}%`,
                                animationDelay: `${i * 50}ms`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right text-[12px] text-[var(--text-secondary)]">
                            {week.rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Overview stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatBadge
                    value={habits.filter(h => h.isActive).length}
                    label="Active Habits"
                    icon="target"
                  />
                  <StatBadge
                    value={`${weeklyStats.percentage}%`}
                    label="This Week"
                    icon="zap"
                    variant="accent"
                  />
                  <StatBadge
                    value={`${Math.round(
                      weeklyTrend.slice(-4).reduce((sum, w) => sum + w.rate, 0) /
                      Math.max(weeklyTrend.slice(-4).length, 1)
                    )}%`}
                    label="4-Week Avg"
                    icon="star"
                  />
                  <StatBadge
                    value={trend === 'up' ? 'Up' : trend === 'down' ? 'Down' : 'Flat'}
                    label="Trend"
                    icon="trophy"
                  />
                </div>

                {/* Overall weekly trend */}
                <Card variant="bordered" padding="md">
                  <CardHeader>
                    <CardTitle>
                      <BarChart3 size={14} className="mr-2 inline" />
                      Weekly Completion Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weeklyTrend.map((week, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-12 text-[11px] text-[var(--text-tertiary)]">
                            {week.week}
                          </span>
                          <div className="flex-1 h-4 bg-[var(--bg-tertiary)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--success)] animate-bar-grow"
                              style={{
                                width: `${week.rate}%`,
                                animationDelay: `${i * 50}ms`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right text-[12px] text-[var(--text-secondary)]">
                            {week.rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="md">
                  <CardHeader>
                    <CardTitle>
                      <BarChart3 size={14} className="mr-2 inline" />
                      Most Improved Habits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mostImprovedHabits.length === 0 ? (
                      <p className="text-[12px] text-[var(--text-tertiary)]">
                        No improvement trend yet. Keep logging to see momentum.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {mostImprovedHabits.map(({ habit, improvement, recentAvg, prevAvg }) => (
                          <div
                            key={habit.id}
                            className="flex items-center justify-between p-2 border border-[var(--border-subtle)]"
                            style={{ borderLeft: `3px solid ${habit.color}` }}
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] text-[var(--text-primary)] truncate">{habit.name}</p>
                              <p className="text-[10px] text-[var(--text-tertiary)]">
                                {prevAvg}% → {recentAvg}%
                              </p>
                            </div>
                            <span className="text-[12px] text-[var(--success)] font-medium">
                              +{improvement}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* Habit Editor Modal */}
      <HabitEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false)
          setEditingHabit(undefined)
        }}
        onSave={handleSaveHabit}
        habit={editingHabit}
        categories={categories}
      />
    </div>
  )
}
