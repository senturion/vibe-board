'use client'

import { useState, useMemo } from 'react'
import { Plus, BarChart3, Calendar, Target, Flame, CalendarDays } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useHabitAnalytics, useAllHabitsAnalytics } from '@/hooks/useHabitAnalytics'
import { useTemporalView } from '@/hooks/useTemporalView'
import { Habit, isHabitActiveToday, formatDateKey, HabitCompletion } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/Progress'
import { EmptyState, LoadingState } from '@/components/ui/EmptyState'
import { StreakBadge, StatBadge } from '@/components/ui/Badge'
import { HabitCard } from './HabitCard'
import { HabitEditor } from './HabitEditor'
import { HabitHeatmap } from './HabitHeatmap'
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
    getActiveHabitsForToday,
  } = useHabits()

  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [showEditor, setShowEditor] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const [selectedHabitForStats, setSelectedHabitForStats] = useState<Habit | undefined>()

  const { todayStats, weeklyStats } = useAllHabitsAnalytics(habits, completions)
  const temporal = useTemporalView('habits')

  const todayHabits = useMemo(() => getActiveHabitsForToday(), [getActiveHabitsForToday])

  // Helper to get completion date from a completion record
  const getCompletionDate = (completion: HabitCompletion) => completion.completionDate

  const selectedHabitStreak = selectedHabitForStats ? getStreak(selectedHabitForStats.id) : undefined
  const selectedHabitAnalytics = useHabitAnalytics({
    habit: selectedHabitForStats,
    completions,
    streak: selectedHabitStreak ? { current: selectedHabitStreak.currentStreak, best: selectedHabitStreak.bestStreak } : undefined,
  })

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[var(--accent)]" />
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Habits</h1>
          </div>

          {/* View mode tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] p-1">
            {(['today', 'all', 'calendar', 'analytics'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode)
                  if (mode !== 'analytics') setSelectedHabitForStats(undefined)
                }}
                className={cn(
                  'px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5',
                  viewMode === mode
                    ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                )}
              >
                {mode === 'today' && 'Today'}
                {mode === 'all' && 'All Habits'}
                {mode === 'calendar' && (
                  <>
                    <CalendarDays size={12} />
                    Calendar
                  </>
                )}
                {mode === 'analytics' && 'Analytics'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setEditingHabit(undefined)
            setShowEditor(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-[var(--accent-muted)] transition-colors"
        >
          <Plus size={14} />
          New Habit
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'today' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Today's Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card variant="bordered" padding="md">
                <div className="flex items-center gap-4">
                  <ProgressRing
                    value={todayStats.percentage}
                    size={60}
                    strokeWidth={5}
                    color="var(--success)"
                  />
                  <div>
                    <p className="text-2xl font-medium text-[var(--text-primary)]">
                      {todayStats.completed}/{todayStats.total}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                      Today
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
                <CardTitle>Today&apos;s Habits</CardTitle>
              </CardHeader>
              <CardContent>
                {todayHabits.length === 0 ? (
                  <EmptyState
                    icon="habits"
                    title="No habits for today"
                    description="Create your first habit to start tracking"
                    action={{
                      label: 'Create Habit',
                      onClick: () => setShowEditor(true),
                    }}
                    size="sm"
                  />
                ) : (
                  <div className="space-y-2 p-4 pt-0">
                    {todayHabits.map((habit) => {
                      const status = getCompletionStatus(habit.id)
                      const streak = getStreak(habit.id)
                      return (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          completionStatus={{ completed: status.isComplete, count: status.count, target: status.target }}
                          streak={{ current: streak?.currentStreak || 0, best: streak?.bestStreak || 0 }}
                          onToggle={() => toggleHabit(habit.id)}
                          onEdit={() => handleEdit(habit)}
                          onDelete={() => deleteHabit(habit.id)}
                          onArchive={() => archiveHabit(habit.id)}
                          onViewStats={() => handleViewStats(habit)}
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
                  const status = getCompletionStatus(habit.id)
                  const streak = getStreak(habit.id)
                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      completionStatus={{ completed: status.isComplete, count: status.count, target: status.target }}
                      streak={{ current: streak?.currentStreak || 0, best: streak?.bestStreak || 0 }}
                      onToggle={() => toggleHabit(habit.id)}
                      onEdit={() => handleEdit(habit)}
                      onDelete={() => deleteHabit(habit.id)}
                      onArchive={() => archiveHabit(habit.id)}
                      onViewStats={() => handleViewStats(habit)}
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
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: habit.color + '20', color: habit.color }}
                      >
                        ✓
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
                      className="px-1.5 py-0.5 rounded text-[10px] truncate"
                      style={{ backgroundColor: habit.color + '20', color: habit.color }}
                    >
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
                  // Group completions by habit
                  const habitCounts = new Map<string, number>()
                  dayCompletions.forEach(c => {
                    habitCounts.set(c.habitId, (habitCounts.get(c.habitId) || 0) + c.count)
                  })

                  const uniqueHabits = Array.from(habitCounts.keys())
                  const totalCompleted = uniqueHabits.length

                  if (totalCompleted === 0) return null

                  return (
                    <div className="space-y-0.5">
                      {uniqueHabits.slice(0, 2).map(habitId => {
                        const habit = habits.find(h => h.id === habitId)
                        if (!habit) return null
                        return (
                          <div
                            key={habitId}
                            className="h-1.5 rounded-full"
                            style={{ backgroundColor: habit.color }}
                          />
                        )
                      })}
                      {totalCompleted > 2 && (
                        <div className="text-[9px] text-[var(--text-tertiary)]">
                          +{totalCompleted - 2}
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
                    label="Total Completions"
                    icon="target"
                  />
                  <StatBadge
                    value={`${selectedHabitAnalytics.stats.completionRate}%`}
                    label="Completion Rate"
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
                      Weekly Completion Rate
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
              <EmptyState
                icon="habits"
                title="Select a habit"
                description="Choose a habit above to view detailed analytics"
                size="lg"
              />
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
