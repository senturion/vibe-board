'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import { useHabits } from '@/hooks/useHabits'
import { useGoals } from '@/hooks/useGoals'
import { useJournal } from '@/hooks/useJournal'
import { useRoutines } from '@/hooks/useRoutines'
import { useFocusTimer } from '@/hooks/useFocusTimer'
import { useSettings } from '@/hooks/useSettings'
import { isHabitActiveToday, formatDateKey } from '@/lib/types'

function getCacheKey() {
  const today = new Date().toISOString().split('T')[0]
  return `vibe-insights-${today}`
}

export function InsightsWidget() {
  const { habits, completions, loading: habitsLoading } = useHabits()
  const { goals, loading: goalsLoading } = useGoals()
  const { entries, getWritingStats, getMoodTrend, loading: journalLoading } = useJournal()
  const { routines, getRoutineProgress, getTodaysRoutines, loading: routinesLoading } = useRoutines()
  const { getTodaysFocusTime, loading: focusLoading } = useFocusTimer()
  const { settings } = useSettings()

  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const aiConfigured = settings.aiProvider !== 'rules'
  const dataLoading = habitsLoading || goalsLoading || journalLoading || routinesLoading || focusLoading

  const buildStats = useCallback(() => {
    const todayKey = formatDateKey(new Date())
    const activeHabits = habits.filter(h => isHabitActiveToday(h))
    const completedHabits = activeHabits.filter(habit => {
      const todayCompletions = completions.filter(
        c => c.habitId === habit.id && c.completionDate === todayKey
      )
      const totalCount = todayCompletions.reduce((sum, c) => sum + c.count, 0)
      return totalCount >= (habit.targetCount || 1)
    }).length

    const activeGoals = goals.filter(g => g.status === 'active')
    const nearestDeadline = activeGoals
      .filter(g => g.targetDate)
      .sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''))
      [0]?.targetDate

    const moodTrend = getMoodTrend(7)
    const moodValues = moodTrend.map(p => p.mood).filter((v): v is number => v !== null)
    const moodAvg7d = moodValues.length > 0
      ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length
      : undefined

    const focusMinutesToday = getTodaysFocusTime()

    const todaysRoutines = getTodaysRoutines()
    let routinesCompletedToday = 0
    for (const routine of todaysRoutines) {
      const progress = getRoutineProgress(routine.id)
      if (progress.total > 0 && progress.completed === progress.total) {
        routinesCompletedToday++
      }
    }

    const journalStats = getWritingStats()

    return {
      habitsCompletedToday: completedHabits,
      habitsActiveToday: activeHabits.length,
      activeGoalCount: activeGoals.length,
      nearestGoalDeadline: nearestDeadline,
      moodAvg7d,
      focusMinutesToday,
      routinesCompletedToday,
      routinesActiveToday: todaysRoutines.length,
      journalStreak: journalStats.streak,
    }
  }, [habits, completions, goals, getMoodTrend, getTodaysFocusTime, getTodaysRoutines, getRoutineProgress, getWritingStats])

  const generateInsight = useCallback(async () => {
    if (!aiConfigured || loading) return
    setLoading(true)
    setError(false)
    try {
      const stats = buildStats()
      const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.insight || ''
        setInsight(text)
        localStorage.setItem(getCacheKey(), text)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [aiConfigured, loading, buildStats])

  // Load cached insight or auto-generate
  useEffect(() => {
    if (dataLoading) return

    const cached = localStorage.getItem(getCacheKey())
    if (cached) {
      setInsight(cached)
      return
    }

    if (aiConfigured) {
      generateInsight()
    }
  }, [dataLoading, aiConfigured]) // eslint-disable-line react-hooks/exhaustive-deps

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] text-[var(--text-tertiary)]">Loading...</p>
      </div>
    )
  }

  // Fallback: no AI configured
  if (!aiConfigured) {
    const stats = buildStats()
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[var(--text-tertiary)]" />
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Insights</span>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1 text-[11px] text-[var(--text-secondary)]">
          <p>Habits: {stats.habitsCompletedToday}/{stats.habitsActiveToday} | Goals: {stats.activeGoalCount} active</p>
          <p>Focus: {stats.focusMinutesToday}m | Journal streak: {stats.journalStreak}d</p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Configure an AI provider in settings for personalized insights</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">AI Insights</span>
        </div>
        <button
          onClick={generateInsight}
          disabled={loading}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-40 transition-colors"
          title="Refresh insight"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
        </button>
      </div>
      <div className="flex-1 flex items-center">
        {loading && !insight ? (
          <p className="text-[11px] text-[var(--text-tertiary)] italic">Generating insight...</p>
        ) : error && !insight ? (
          <p className="text-[11px] text-[var(--text-tertiary)]">Failed to generate insight. Click refresh to try again.</p>
        ) : insight ? (
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{insight}</p>
        ) : null}
      </div>
    </div>
  )
}
