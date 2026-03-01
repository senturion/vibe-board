'use client'

import { useState, useMemo } from 'react'
import { useHabits } from '@/hooks/useHabits'
import { useAllHabitsAnalytics } from '@/hooks/useHabitAnalytics'
import { useTemporalView } from '@/hooks/useTemporalView'
import { Habit, formatDateKey, parseDateKey, DayOfWeek } from '@/lib/types'
import { LoadingState } from '@/components/ui/EmptyState'
import { HabitEditor } from './HabitEditor'
import { HabitsHeader, ViewMode } from './HabitsHeader'
import { TodayView } from './TodayView'
import { AllHabitsView } from './AllHabitsView'
import { CalendarView } from './CalendarView'
import { AnalyticsView } from './AnalyticsView'

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

  const { weeklyStats } = useAllHabitsAnalytics(habits, completions)
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

  const bestStreak = useMemo(() =>
    Math.max(...habits.map(h => getStreak(h.id)?.bestStreak || 0), 0),
    [habits, getStreak]
  )

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
      <HabitsHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        showMobileViewMenu={showMobileViewMenu}
        setShowMobileViewMenu={setShowMobileViewMenu}
        logDate={logDate}
        setLogDateKey={setLogDateKey}
        onNewHabit={() => {
          setEditingHabit(undefined)
          setShowEditor(true)
        }}
        onClearSelectedHabit={() => setSelectedHabitForStats(undefined)}
      />

      <div className="flex-1 overflow-auto min-h-0 p-4 sm:p-6">
        {viewMode === 'today' && (
          <TodayView
            activeHabitsForDate={activeHabitsForDate}
            dayStats={dayStats}
            isLogDateToday={isLogDateToday}
            logDate={logDate}
            weeklyPercentage={weeklyStats.percentage}
            bestStreak={bestStreak}
            getCompletionStatus={getCompletionStatus}
            getStreak={getStreak}
            onToggle={(habitId) => toggleHabit(habitId, logDate)}
            onEdit={handleEdit}
            onDelete={deleteHabit}
            onArchive={archiveHabit}
            onViewStats={handleViewStats}
            onCreateHabit={() => setShowEditor(true)}
          />
        )}

        {viewMode === 'all' && (
          <AllHabitsView
            habits={habits}
            logDate={logDate}
            isLogDateToday={isLogDateToday}
            getCompletionStatus={getCompletionStatus}
            getStreak={getStreak}
            onToggle={(habitId) => toggleHabit(habitId, logDate)}
            onEdit={handleEdit}
            onDelete={deleteHabit}
            onArchive={archiveHabit}
            onViewStats={handleViewStats}
            onCreateHabit={() => setShowEditor(true)}
          />
        )}

        {viewMode === 'calendar' && (
          <CalendarView
            habits={habits}
            completions={completions}
            temporal={temporal}
          />
        )}

        {viewMode === 'analytics' && (
          <AnalyticsView
            habits={habits}
            completions={completions}
            completionsByDate={completionsByDate}
            selectedHabit={selectedHabitForStats}
            onSelectHabit={setSelectedHabitForStats}
            getStreak={getStreak}
          />
        )}
      </div>

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
