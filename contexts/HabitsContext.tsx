'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/hooks/useSettings'
import { Database } from '@/lib/supabase/types'
import { haptics } from '@/lib/haptics'
import {
  Habit,
  HabitCategory,
  HabitCompletion,
  HabitStreak,
  HabitType,
  TrackingMode,
  FrequencyType,
  DayOfWeek,
  formatDateKey,
  parseDateKey,
  isHabitActiveToday,
  getWeekDateKeys,
  getWeekKey,
  getWeekStart,
} from '@/lib/types'

type HabitRow = Database['public']['Tables']['habits']['Row']
type HabitCategoryRow = Database['public']['Tables']['habit_categories']['Row']
type HabitCompletionRow = Database['public']['Tables']['habit_completions']['Row']
type HabitStreakRow = Database['public']['Tables']['habit_streaks']['Row']

interface HabitsContextType {
  habits: Habit[]
  categories: HabitCategory[]
  completions: HabitCompletion[]
  streaks: Map<string, HabitStreak>
  loading: boolean
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'order'>) => Promise<string>
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  archiveHabit: (id: string) => Promise<void>
  toggleHabit: (habitId: string, date?: Date) => Promise<void>
  getCompletionStatus: (habitId: string, date?: Date) => { count: number; target: number; isComplete: boolean }
  getStreak: (habitId: string) => HabitStreak | undefined
  updateStreak: (habitId: string, options?: { completionsOverride?: HabitCompletion[] }) => Promise<void>
  getTodaysHabits: () => Habit[]
  getActiveHabitsForToday: () => Habit[]
  addCategory: (name: string, color: string) => Promise<string>
  updateCategory: (id: string, updates: Partial<HabitCategory>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined)

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<HabitCategory[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [streaks, setStreaks] = useState<Map<string, HabitStreak>>(new Map())
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { settings } = useSettings()
  const supabase = createClient()

  // Fetch habits, categories, completions, and streaks
  useEffect(() => {
    if (!user) {
      setHabits([])
      setCategories([])
      setCompletions([])
      setStreaks(new Map())
      setLoading(false)
      return
    }

    const fetchData = async () => {
      // Fetch habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('order', { ascending: true })
        .returns<HabitRow[]>()

      if (habitsError) {
        console.error('Error fetching habits:', habitsError)
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('habit_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })
        .returns<HabitCategoryRow[]>()

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      }

      // Fetch recent completions (last 90 days for heatmap)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: completionsData, error: completionsError } = await supabase
        .from('habit_completions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completion_date', formatDateKey(ninetyDaysAgo))
        .returns<HabitCompletionRow[]>()

      if (completionsError) {
        console.error('Error fetching completions:', completionsError)
      }

      // Fetch streaks
      const { data: streaksData, error: streaksError } = await supabase
        .from('habit_streaks')
        .select('*')
        .eq('user_id', user.id)
        .returns<HabitStreakRow[]>()

      if (streaksError) {
        console.error('Error fetching streaks:', streaksError)
      }

      // Map habits
      const mappedHabits: Habit[] = (habitsData || []).map(h => ({
        id: h.id,
        categoryId: h.category_id || undefined,
        name: h.name,
        description: h.description || undefined,
        frequencyType: h.frequency_type as FrequencyType,
        frequencyValue: h.frequency_value || 1,
        specificDays: h.specific_days as DayOfWeek[] || undefined,
        targetCount: h.target_count,
        isActive: h.is_active,
        color: h.color,
        icon: h.icon || undefined,
        habitType: (h.habit_type || 'build') as HabitType,
        trackingMode: (h.tracking_mode || 'manual') as TrackingMode,
        order: h.order,
        createdAt: new Date(h.created_at).getTime(),
        archivedAt: h.archived_at ? new Date(h.archived_at).getTime() : undefined,
      }))

      // Map categories
      const mappedCategories: HabitCategory[] = (categoriesData || []).map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon || undefined,
        order: c.order,
        createdAt: new Date(c.created_at).getTime(),
      }))

      // Map completions
      const mappedCompletions: HabitCompletion[] = (completionsData || []).map(c => ({
        id: c.id,
        habitId: c.habit_id,
        completionDate: c.completion_date,
        count: c.count,
        note: c.note || undefined,
        completedAt: new Date(c.completed_at).getTime(),
      }))

      // Map streaks
      const streaksMap = new Map<string, HabitStreak>()
      ;(streaksData || []).forEach(s => {
        streaksMap.set(s.habit_id, {
          id: s.id,
          habitId: s.habit_id,
          currentStreak: s.current_streak,
          bestStreak: s.best_streak,
          lastCompletionDate: s.last_completion_date || undefined,
          updatedAt: new Date(s.updated_at).getTime(),
        })
      })

      setHabits(mappedHabits)
      setCategories(mappedCategories)
      setCompletions(mappedCompletions)
      setStreaks(streaksMap)
      setLoading(false)
    }

    fetchData()
  }, [user, supabase])

  // Add a new habit
  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'createdAt' | 'order'>) => {
    if (!user) return ''

    const order = habits.length
    const { data, error } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        category_id: habit.categoryId || null,
        name: habit.name,
        description: habit.description || null,
        frequency_type: habit.frequencyType,
        frequency_value: habit.frequencyValue,
        specific_days: habit.specificDays || null,
        target_count: habit.targetCount,
        is_active: habit.isActive,
        color: habit.color,
        icon: habit.icon || null,
        habit_type: habit.habitType || 'build',
        tracking_mode: habit.trackingMode || 'manual',
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating habit:', error.message, error.details, error.hint, error.code)
      return ''
    }

    const newHabit: Habit = {
      id: data.id,
      categoryId: data.category_id || undefined,
      name: data.name,
      description: data.description || undefined,
      frequencyType: data.frequency_type as FrequencyType,
      frequencyValue: data.frequency_value || 1,
      specificDays: data.specific_days as DayOfWeek[] || undefined,
      targetCount: data.target_count,
      isActive: data.is_active,
      color: data.color,
      icon: data.icon || undefined,
      habitType: (data.habit_type || 'build') as HabitType,
      trackingMode: (data.tracking_mode || 'manual') as TrackingMode,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setHabits(prev => [...prev, newHabit])

    // Create initial streak record
    await supabase.from('habit_streaks').insert({
      user_id: user.id,
      habit_id: data.id,
      current_streak: 0,
      best_streak: 0,
    })

    setStreaks(prev => {
      const newMap = new Map(prev)
      newMap.set(data.id, {
        id: data.id,
        habitId: data.id,
        currentStreak: 0,
        bestStreak: 0,
        updatedAt: Date.now(),
      })
      return newMap
    })

    return newHabit.id
  }, [user, supabase, habits.length])

  // Update a habit
  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    if (!user) return

    const oldHabit = habits.find(h => h.id === id)

    const dbUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId
    if (updates.frequencyType !== undefined) dbUpdates.frequency_type = updates.frequencyType
    if (updates.frequencyValue !== undefined) dbUpdates.frequency_value = updates.frequencyValue
    if (updates.specificDays !== undefined) dbUpdates.specific_days = updates.specificDays
    if (updates.targetCount !== undefined) dbUpdates.target_count = updates.targetCount
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
    if (updates.color !== undefined) dbUpdates.color = updates.color
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon
    if (updates.habitType !== undefined) dbUpdates.habit_type = updates.habitType
    if (updates.trackingMode !== undefined) dbUpdates.tracking_mode = updates.trackingMode

    const { error } = await supabase
      .from('habits')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('Error updating habit:', error)
      return
    }

    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))

    // Migrate completions when switching from build → avoid+auto-complete
    const wasAutoComplete = oldHabit?.habitType === 'avoid' && oldHabit?.trackingMode === 'auto-complete'
    const becomingAutoComplete = updates.habitType === 'avoid' && updates.trackingMode === 'auto-complete'
    if (oldHabit && !wasAutoComplete && becomingAutoComplete) {
      await migrateCompletionsForAvoid(id, oldHabit)
    }
  }, [user, supabase, habits])

  // Invert completion records when switching to avoid+auto-complete
  const migrateCompletionsForAvoid = useCallback(async (habitId: string, habit: Habit) => {
    if (!user) return

    const habitCompletions = completions.filter(c => c.habitId === habitId)
    const existingDates = new Set(habitCompletions.map(c => c.completionDate))

    // All applicable dates from creation to yesterday
    const startDate = new Date(habit.createdAt)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const datesToCreate: string[] = []
    for (let d = new Date(startDate); d <= yesterday; d.setDate(d.getDate() + 1)) {
      if (habit.frequencyType === 'specific_days') {
        const dow = d.getDay() === 0 ? 7 : d.getDay()
        if (!habit.specificDays?.includes(dow as DayOfWeek)) continue
      }
      const key = formatDateKey(new Date(d))
      if (!existingDates.has(key)) datesToCreate.push(key)
    }

    // Delete old completions (were successes, no record needed in auto-complete)
    const idsToDelete = habitCompletions.map(c => c.id)
    if (idsToDelete.length > 0) {
      await supabase.from('habit_completions').delete().in('id', idsToDelete)
    }

    // Create records for unmarked days (now slips in auto-complete)
    let newCompletions: HabitCompletion[] = []
    if (datesToCreate.length > 0) {
      const inserts = datesToCreate.map(dateKey => ({
        user_id: user.id,
        habit_id: habitId,
        completion_date: dateKey,
        count: 1,
      }))
      const { data } = await supabase
        .from('habit_completions')
        .insert(inserts)
        .select()

      if (data) {
        newCompletions = data.map(row => ({
          id: row.id,
          habitId: row.habit_id,
          completionDate: row.completion_date,
          count: row.count,
          completedAt: new Date(row.completed_at).getTime(),
        }))
      }
    }

    // Update local state
    setCompletions(prev => [
      ...prev.filter(c => c.habitId !== habitId),
      ...newCompletions,
    ])

    // Clear cached streak so it recomputes from new completions
    setStreaks(prev => {
      const next = new Map(prev)
      next.delete(habitId)
      return next
    })
  }, [user, supabase, completions])

  // Archive a habit
  const archiveHabit = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('habits')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error archiving habit:', error)
      return
    }

    setStreaks(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })

    setHabits(prev => prev.filter(h => h.id !== id))
  }, [user, supabase])

  // Delete a habit
  const deleteHabit = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting habit:', error)
      return
    }

    setHabits(prev => prev.filter(h => h.id !== id))
  }, [user, supabase])

  // Get completion status for a habit on a date
  const getCompletionStatus = useCallback((habitId: string, date: Date = new Date()) => {
    const dateKey = formatDateKey(date)
    const habit = habits.find(h => h.id === habitId)
    if (!habit) {
      return { count: 0, target: 0, isComplete: false }
    }

    if (habit.frequencyType === 'weekly') {
      const weekKeys = getWeekDateKeys(date, settings.weekStartsOn)
      let completedDays = 0
      weekKeys.forEach((key) => {
        const dayCount = completions
          .filter(c => c.habitId === habitId && c.completionDate === key)
          .reduce((sum, c) => sum + c.count, 0)
        if (dayCount >= habit.targetCount) {
          completedDays += 1
        }
      })
      const target = Math.max(habit.frequencyValue || 1, 1)

      // For checkbox display, check if TODAY is complete (not the weekly goal)
      const todayCount = completions
        .filter(c => c.habitId === habitId && c.completionDate === dateKey)
        .reduce((sum, c) => sum + c.count, 0)
      const isTodayComplete = todayCount >= habit.targetCount

      const result = {
        count: completedDays,
        target,
        isComplete: isTodayComplete,  // Checkbox shows TODAY's status
      }
      return result
    }

    const target = habit.targetCount || 1
    const count = completions
      .filter(c => c.habitId === habitId && c.completionDate === dateKey)
      .reduce((sum, c) => sum + c.count, 0)

    const result = {
      count,
      target,
      isComplete: count >= target,
    }
    return result
  }, [habits, completions, settings.weekStartsOn])

  const computeStreakFromCompletions = useCallback((habitId: string, completionsOverride?: HabitCompletion[]) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return undefined

    // For avoid habits with auto-complete, streak = consecutive days with NO completions (no slips)
    const isAvoidAutoComplete = habit.habitType === 'avoid' && habit.trackingMode === 'auto-complete'

    if (isAvoidAutoComplete) {
      const sourceCompletions = completionsOverride || completions
      const slipDates = new Set<string>()
      sourceCompletions.forEach((completion) => {
        if (completion.habitId !== habitId) return
        slipDates.add(completion.completionDate)
      })

      // Count consecutive clean days going backward from today
      const today = new Date()
      const todayKey = formatDateKey(today)

      let currentStreak = 0
      let cursor = new Date(today)

      // Check today first
      if (!slipDates.has(todayKey)) {
        currentStreak = 1
        cursor.setDate(cursor.getDate() - 1)

        while (true) {
          const key = formatDateKey(cursor)
          // Don't count days before habit was created
          if (cursor.getTime() < habit.createdAt) break
          if (slipDates.has(key)) break
          currentStreak += 1
          cursor.setDate(cursor.getDate() - 1)
        }
      }

      // Calculate best streak: find longest gap between slips
      const habitCreatedDate = new Date(habit.createdAt)
      const sortedSlips = Array.from(slipDates).sort()

      let bestStreak = currentStreak
      let prevDate = habitCreatedDate

      for (const slipKey of sortedSlips) {
        const slipDate = parseDateKey(slipKey)
        const daysBetween = Math.floor((slipDate.getTime() - prevDate.getTime()) / 86400000)
        if (daysBetween > bestStreak) bestStreak = daysBetween
        prevDate = new Date(slipDate)
        prevDate.setDate(prevDate.getDate() + 1) // day after the slip
      }

      // Check streak from last slip to today
      const daysSinceLastSlip = sortedSlips.length > 0
        ? Math.floor((today.getTime() - parseDateKey(sortedSlips[sortedSlips.length - 1]).getTime()) / 86400000)
        : Math.floor((today.getTime() - habitCreatedDate.getTime()) / 86400000) + 1
      if (daysSinceLastSlip > bestStreak) bestStreak = daysSinceLastSlip

      const lastCompletionDate = sortedSlips.length > 0 ? sortedSlips[sortedSlips.length - 1] : undefined

      return { currentStreak, bestStreak, lastCompletionDate }
    }

    const sourceCompletions = completionsOverride || completions
    const dailyCounts = new Map<string, number>()
    sourceCompletions.forEach((completion) => {
      if (completion.habitId !== habitId) return
      const current = dailyCounts.get(completion.completionDate) || 0
      dailyCounts.set(completion.completionDate, current + completion.count)
    })

    const completedDays = Array.from(dailyCounts.entries())
      .filter(([, count]) => count >= habit.targetCount)
      .map(([dateKey]) => dateKey)
      .sort()

    if (completedDays.length === 0) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        lastCompletionDate: undefined,
      }
    }

    if (habit.frequencyType === 'weekly') {
      const weeklyTarget = Math.max(habit.frequencyValue || 1, 1)
      const weekCounts = new Map<string, { count: number; lastDateKey: string }>()
      completedDays.forEach((dateKey) => {
        const weekKey = getWeekKey(parseDateKey(dateKey), settings.weekStartsOn)
        const existing = weekCounts.get(weekKey)
        const nextCount = (existing?.count || 0) + 1
        const lastDateKey = !existing?.lastDateKey || existing.lastDateKey < dateKey
          ? dateKey
          : existing.lastDateKey
        weekCounts.set(weekKey, { count: nextCount, lastDateKey })
      })

      const completedWeeks = Array.from(weekCounts.entries())
        .filter(([, data]) => data.count >= weeklyTarget)
        .map(([weekKey]) => weekKey)
        .sort()

      if (completedWeeks.length === 0) {
        return {
          currentStreak: 0,
          bestStreak: 0,
          lastCompletionDate: undefined,
        }
      }

      const weekMs = 7 * 86400000
      const toWeekTime = (weekKey: string) => parseDateKey(weekKey).getTime()
      const completedWeekSet = new Set(completedWeeks)

      let bestStreak = 1
      let currentRun = 1
      for (let i = 1; i < completedWeeks.length; i++) {
        const prev = toWeekTime(completedWeeks[i - 1])
        const curr = toWeekTime(completedWeeks[i])
        if ((curr - prev) === weekMs) {
          currentRun += 1
        } else {
          currentRun = 1
        }
        if (currentRun > bestStreak) bestStreak = currentRun
      }

      const thisWeekKey = getWeekKey(new Date(), settings.weekStartsOn)
      const lastWeekStart = getWeekStart(new Date(), settings.weekStartsOn)
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)
      const lastWeekKey = formatDateKey(lastWeekStart)

      let currentStreak = 0
      let streakEndKey: string | null = null
      if (completedWeekSet.has(thisWeekKey)) {
        streakEndKey = thisWeekKey
      } else if (completedWeekSet.has(lastWeekKey)) {
        streakEndKey = lastWeekKey
      }

      if (streakEndKey) {
        currentStreak = 1
        let cursorDate = parseDateKey(streakEndKey)
        while (true) {
          cursorDate.setDate(cursorDate.getDate() - 7)
          const prevKey = formatDateKey(cursorDate)
          if (completedWeekSet.has(prevKey)) {
            currentStreak += 1
          } else {
            break
          }
        }
      }

      const lastCompletedWeekKey = completedWeeks[completedWeeks.length - 1]
      const lastCompletionDate = weekCounts.get(lastCompletedWeekKey)?.lastDateKey

      return { currentStreak, bestStreak, lastCompletionDate }
    }

    const dayMs = 86400000
    const toDayTime = (dateKey: string) => parseDateKey(dateKey).getTime()
    const completedSet = new Set(completedDays)

    let bestStreak = 1
    let currentRun = 1
    for (let i = 1; i < completedDays.length; i++) {
      const prev = toDayTime(completedDays[i - 1])
      const curr = toDayTime(completedDays[i])
      if ((curr - prev) === dayMs) {
        currentRun += 1
      } else {
        currentRun = 1
      }
      if (currentRun > bestStreak) bestStreak = currentRun
    }

    const todayKey = formatDateKey(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = formatDateKey(yesterday)

    const isTodayComplete = (dailyCounts.get(todayKey) || 0) >= habit.targetCount
    const isYesterdayComplete = (dailyCounts.get(yesterdayKey) || 0) >= habit.targetCount

    let currentStreak = 0
    let streakEndKey: string | null = null
    if (isTodayComplete) {
      streakEndKey = todayKey
    } else if (isYesterdayComplete) {
      streakEndKey = yesterdayKey
    }

    if (streakEndKey) {
      currentStreak = 1
      let cursorDate = parseDateKey(streakEndKey)
      while (true) {
        cursorDate.setDate(cursorDate.getDate() - 1)
        const prevKey = formatDateKey(cursorDate)
        if (completedSet.has(prevKey)) {
          currentStreak += 1
        } else {
          break
        }
      }
    }

    const lastCompletionDate = completedDays[completedDays.length - 1]
    return { currentStreak, bestStreak, lastCompletionDate }
  }, [completions, habits, settings.weekStartsOn])

  // Get streak for a habit
  const getStreak = useCallback((habitId: string) => {
    const streak = streaks.get(habitId)
    const computed = computeStreakFromCompletions(habitId)

    if (!computed) return streak

    return {
      id: streak?.id || habitId,
      habitId,
      currentStreak: computed.currentStreak,
      bestStreak: computed.bestStreak,
      lastCompletionDate: computed.lastCompletionDate ?? streak?.lastCompletionDate,
      updatedAt: Date.now(),
    }
  }, [streaks, computeStreakFromCompletions])

  // Update streak for a habit
  const updateStreak = useCallback(async (habitId: string, options?: { completionsOverride?: HabitCompletion[] }) => {
    if (!user) return

    const currentStreak = streaks.get(habitId)
    const computed = computeStreakFromCompletions(habitId, options?.completionsOverride)
    if (!computed) return

    const newCurrentStreak = computed.currentStreak
    const newBestStreak = computed.bestStreak
    const newLastCompletionDate = computed.lastCompletionDate

    const { error } = await supabase
      .from('habit_streaks')
      .upsert({
        user_id: user.id,
        habit_id: habitId,
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        last_completion_date: newLastCompletionDate || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,habit_id',
      })

    if (error) {
      console.error('Error updating streak:', error)
      return
    }

    setStreaks(prev => {
      const newMap = new Map(prev)
      newMap.set(habitId, {
        id: currentStreak?.id || habitId,
        habitId,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        lastCompletionDate: newLastCompletionDate,
        updatedAt: Date.now(),
      })
      return newMap
    })
  }, [user, supabase, streaks, computeStreakFromCompletions])

  // Toggle habit completion
  const toggleHabit = useCallback(async (habitId: string, date: Date = new Date()) => {
    if (!user) return

    const dateKey = formatDateKey(date)
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return


    // Check current completion status using latest state
    const todayCompletions = completions.filter(
      c => c.habitId === habitId && c.completionDate === dateKey
    )
    const currentCount = todayCompletions.reduce((sum, c) => sum + c.count, 0)

    if (currentCount >= habit.targetCount) {
      // Already complete, remove today's completions
      const todayCompletionIds = todayCompletions.map(c => c.id)

      const { error } = await supabase
        .from('habit_completions')
        .delete()
        .in('id', todayCompletionIds)

      if (error) {
        console.error('Error removing completion:', error)
        return
      }

      // Use functional update to ensure we work with latest state
      let nextCompletions: HabitCompletion[] = []
      setCompletions(prev => {
        nextCompletions = prev.filter(c => !todayCompletionIds.includes(c.id))
        return nextCompletions
      })

      // Update streak after state is set
      await updateStreak(habitId, { completionsOverride: nextCompletions })
    } else {
      // Add completion
      const { data, error } = await supabase
        .from('habit_completions')
        .insert({
          user_id: user.id,
          habit_id: habitId,
          completion_date: dateKey,
          count: 1,
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding completion:', error)
        return
      }

      const newCompletion: HabitCompletion = {
        id: data.id,
        habitId: data.habit_id,
        completionDate: data.completion_date,
        count: data.count,
        completedAt: new Date(data.completed_at).getTime(),
      }

      // Use functional update to ensure we work with latest state
      let nextCompletions: HabitCompletion[] = []
      setCompletions(prev => {
        nextCompletions = [...prev, newCompletion]
        return nextCompletions
      })

      // Haptic feedback on habit completion
      const newCount = currentCount + 1
      if (newCount >= habit.targetCount) {
        haptics.success()
      } else {
        haptics.light()
      }

      // Update streak after state is set
      await updateStreak(habitId, { completionsOverride: nextCompletions })
    }
  }, [user, supabase, habits, completions, updateStreak])

  // Get today's habits
  const getTodaysHabits = useCallback(() => {
    return habits.filter(isHabitActiveToday)
  }, [habits])

  // Add category
  const addCategory = useCallback(async (name: string, color: string) => {
    if (!user) return ''

    const order = categories.length
    const { data, error } = await supabase
      .from('habit_categories')
      .insert({
        user_id: user.id,
        name,
        color,
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return ''
    }

    const newCategory: HabitCategory = {
      id: data.id,
      name: data.name,
      color: data.color,
      icon: data.icon || undefined,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setCategories(prev => [...prev, newCategory])
    return newCategory.id
  }, [user, supabase, categories.length])

  // Update category
  const updateCategory = useCallback(async (id: string, updates: Partial<HabitCategory>) => {
    if (!user) return

    const dbUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.color !== undefined) dbUpdates.color = updates.color
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon

    const { error } = await supabase
      .from('habit_categories')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('Error updating category:', error)
      return
    }

    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [user, supabase])

  // Delete category
  const deleteCategory = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('habit_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return
    }

    setCategories(prev => prev.filter(c => c.id !== id))
    // Update habits that had this category
    setHabits(prev => prev.map(h => h.categoryId === id ? { ...h, categoryId: undefined } : h))
  }, [user, supabase])

  return (
    <HabitsContext.Provider
      value={{
        habits,
        categories,
        completions,
        streaks,
        loading,
        addHabit,
        updateHabit,
        deleteHabit,
        archiveHabit,
        toggleHabit,
        getCompletionStatus,
        getStreak,
        updateStreak,
        getTodaysHabits,
        getActiveHabitsForToday: getTodaysHabits,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </HabitsContext.Provider>
  )
}

export function useHabitsContext() {
  const context = useContext(HabitsContext)
  if (context === undefined) {
    throw new Error('useHabitsContext must be used within a HabitsProvider')
  }
  return context
}
