'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@/lib/supabase/types'
import { haptics } from '@/lib/haptics'
import {
  Habit,
  HabitCategory,
  HabitCompletion,
  HabitStreak,
  FrequencyType,
  DayOfWeek,
  formatDateKey,
  parseDateKey,
  isHabitActiveToday,
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
  updateStreak: (habitId: string, todayCompleteOverride?: boolean) => Promise<void>
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

    const { error } = await supabase
      .from('habits')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('Error updating habit:', error)
      return
    }

    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [user, supabase])

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

  // Toggle habit completion
  const toggleHabit = useCallback(async (habitId: string, date: Date = new Date()) => {
    if (!user) return

    const dateKey = formatDateKey(date)
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return

    // Check current completion status
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

      setCompletions(prev => prev.filter(c => !todayCompletionIds.includes(c.id)))
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

      setCompletions(prev => [...prev, newCompletion])

      // Haptic feedback on habit completion
      const newCount = currentCount + 1
      if (newCount >= habit.targetCount) {
        haptics.success()
      } else {
        haptics.light()
      }

      // Update streak if completing for today and target reached
      if (dateKey === formatDateKey(new Date())) {
        const nextCount = currentCount + 1
        if (nextCount >= habit.targetCount) {
          await updateStreak(habitId, true)
        }
      }
    }
  }, [user, supabase, habits, completions])

  // Get completion status for a habit on a date
  const getCompletionStatus = useCallback((habitId: string, date: Date = new Date()) => {
    const dateKey = formatDateKey(date)
    const habit = habits.find(h => h.id === habitId)
    const target = habit?.targetCount || 1

    const dayCompletions = completions.filter(
      c => c.habitId === habitId && c.completionDate === dateKey
    )
    const count = dayCompletions.reduce((sum, c) => sum + c.count, 0)

    return {
      count,
      target,
      isComplete: count >= target,
    }
  }, [habits, completions])

  const computeStreakFromCompletions = useCallback((habitId: string) => {
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return undefined

    const dailyCounts = new Map<string, number>()
    completions.forEach((completion) => {
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
  }, [completions, habits])

  // Get streak for a habit
  const getStreak = useCallback((habitId: string) => {
    const streak = streaks.get(habitId)
    const computed = computeStreakFromCompletions(habitId)

    if (!computed) return streak

    if (!streak) {
      return {
        id: habitId,
        habitId,
        currentStreak: computed.currentStreak,
        bestStreak: computed.bestStreak,
        lastCompletionDate: computed.lastCompletionDate,
        updatedAt: Date.now(),
      }
    }

    const useComputed =
      computed.currentStreak > streak.currentStreak ||
      computed.bestStreak > streak.bestStreak

    if (!useComputed) {
      return streak
    }

    return {
      id: streak.id,
      habitId,
      currentStreak: computed.currentStreak,
      bestStreak: computed.bestStreak,
      lastCompletionDate: computed.lastCompletionDate ?? streak.lastCompletionDate,
      updatedAt: Date.now(),
    }
  }, [streaks, computeStreakFromCompletions])

  // Update streak for a habit
  const updateStreak = useCallback(async (habitId: string, todayCompleteOverride?: boolean) => {
    if (!user) return

    const today = formatDateKey(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = formatDateKey(yesterday)

    const currentStreak = streaks.get(habitId)
    const habit = habits.find(h => h.id === habitId)
    if (!habit) return

    // Check if completed today
    const todayComplete = todayCompleteOverride ?? getCompletionStatus(habitId, new Date()).isComplete

    if (!todayComplete) return

    // Check if completed yesterday
    const yesterdayComplete = getCompletionStatus(habitId, yesterday).isComplete

    let newCurrentStreak = 1
    if (currentStreak?.lastCompletionDate === yesterdayKey && yesterdayComplete) {
      newCurrentStreak = currentStreak.currentStreak + 1
    } else if (currentStreak?.lastCompletionDate === today) {
      // Already updated today
      return
    }

    const newBestStreak = Math.max(newCurrentStreak, currentStreak?.bestStreak || 0)

    const { error } = await supabase
      .from('habit_streaks')
      .upsert({
        user_id: user.id,
        habit_id: habitId,
        current_streak: newCurrentStreak,
        best_streak: newBestStreak,
        last_completion_date: today,
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
        lastCompletionDate: today,
        updatedAt: Date.now(),
      })
      return newMap
    })
  }, [user, supabase, streaks, habits, getCompletionStatus])

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
