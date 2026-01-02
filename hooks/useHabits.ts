'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Habit,
  HabitCategory,
  HabitCompletion,
  HabitStreak,
  FrequencyType,
  DayOfWeek,
  formatDateKey,
  isHabitActiveToday,
} from '@/lib/types'

export function useHabits() {
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

      if (habitsError) {
        console.error('Error fetching habits:', habitsError)
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('habit_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

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

      if (completionsError) {
        console.error('Error fetching completions:', completionsError)
      }

      // Fetch streaks
      const { data: streaksData, error: streaksError } = await supabase
        .from('habit_streaks')
        .select('*')
        .eq('user_id', user.id)

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

    // Initialize streak for new habit
    await supabase.from('habit_streaks').insert({
      user_id: user.id,
      habit_id: data.id,
      current_streak: 0,
      best_streak: 0,
    })

    setHabits(prev => [...prev, newHabit])
    setStreaks(prev => new Map(prev).set(data.id, {
      id: '',
      habitId: data.id,
      currentStreak: 0,
      bestStreak: 0,
      updatedAt: Date.now(),
    }))

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
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating habit:', error)
      return
    }

    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }, [user, supabase])

  // Delete a habit
  const deleteHabit = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting habit:', error)
      return
    }

    setHabits(prev => prev.filter(h => h.id !== id))
    setCompletions(prev => prev.filter(c => c.habitId !== id))
    setStreaks(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }, [user, supabase])

  // Archive a habit
  const archiveHabit = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('habits')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error archiving habit:', error)
      return
    }

    setHabits(prev => prev.filter(h => h.id !== id))
  }, [user, supabase])

  // Toggle habit completion for today (or specific date)
  const toggleHabit = useCallback(async (habitId: string, date: Date = new Date()) => {
    if (!user) return

    const dateKey = formatDateKey(date)
    const existingCompletion = completions.find(
      c => c.habitId === habitId && c.completionDate === dateKey
    )

    if (existingCompletion) {
      // Remove completion
      const { error } = await supabase
        .from('habit_completions')
        .delete()
        .eq('id', existingCompletion.id)

      if (error) {
        console.error('Error removing completion:', error)
        return
      }

      setCompletions(prev => prev.filter(c => c.id !== existingCompletion.id))
      await updateStreak(habitId)
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
      await updateStreak(habitId)
    }
  }, [user, supabase, completions])

  // Update streak calculation
  const updateStreak = useCallback(async (habitId: string) => {
    if (!user) return

    // Get all completions for this habit, sorted by date
    const { data: allCompletions } = await supabase
      .from('habit_completions')
      .select('completion_date')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .order('completion_date', { ascending: false })

    if (!allCompletions || allCompletions.length === 0) {
      // Reset streak
      await supabase
        .from('habit_streaks')
        .upsert({
          user_id: user.id,
          habit_id: habitId,
          current_streak: 0,
          best_streak: streaks.get(habitId)?.bestStreak || 0,
          last_completion_date: null,
          updated_at: new Date().toISOString(),
        })

      setStreaks(prev => new Map(prev).set(habitId, {
        ...prev.get(habitId)!,
        currentStreak: 0,
        lastCompletionDate: undefined,
        updatedAt: Date.now(),
      }))
      return
    }

    // Calculate current streak
    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dates = allCompletions.map(c => c.completion_date)
    let checkDate = today

    // Check if streak includes today or yesterday
    const todayKey = formatDateKey(today)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = formatDateKey(yesterday)

    if (!dates.includes(todayKey) && !dates.includes(yesterdayKey)) {
      // Streak is broken
      currentStreak = 0
    } else {
      // Count consecutive days
      if (dates.includes(todayKey)) {
        currentStreak = 1
        checkDate = yesterday
      } else {
        currentStreak = 1
        checkDate = new Date(yesterday)
        checkDate.setDate(checkDate.getDate() - 1)
      }

      while (dates.includes(formatDateKey(checkDate))) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }

    const existingStreak = streaks.get(habitId)
    const bestStreak = Math.max(currentStreak, existingStreak?.bestStreak || 0)

    await supabase
      .from('habit_streaks')
      .upsert({
        user_id: user.id,
        habit_id: habitId,
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_completion_date: dates[0],
        updated_at: new Date().toISOString(),
      })

    setStreaks(prev => new Map(prev).set(habitId, {
      id: existingStreak?.id || '',
      habitId,
      currentStreak,
      bestStreak,
      lastCompletionDate: dates[0],
      updatedAt: Date.now(),
    }))
  }, [user, supabase, streaks])

  // Get completion status for a habit on a specific date
  const getCompletionStatus = useCallback((habitId: string, date: Date = new Date()) => {
    const dateKey = formatDateKey(date)
    const completion = completions.find(
      c => c.habitId === habitId && c.completionDate === dateKey
    )
    const habit = habits.find(h => h.id === habitId)

    if (!habit) return { completed: false, count: 0, target: 1 }

    return {
      completed: completion ? completion.count >= habit.targetCount : false,
      count: completion?.count || 0,
      target: habit.targetCount,
    }
  }, [completions, habits])

  // Get streak for a habit
  const getStreak = useCallback((habitId: string) => {
    const streak = streaks.get(habitId)
    return {
      current: streak?.currentStreak || 0,
      best: streak?.bestStreak || 0,
    }
  }, [streaks])

  // Get habits that should be tracked today
  const getActiveHabitsForToday = useCallback(() => {
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
  }, [user, supabase])

  // Update category
  const updateCategory = useCallback(async (id: string, updates: Partial<HabitCategory>) => {
    if (!user) return

    const { error } = await supabase
      .from('habit_categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

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
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting category:', error)
      return
    }

    setCategories(prev => prev.filter(c => c.id !== id))
    // Update habits that had this category
    setHabits(prev => prev.map(h => h.categoryId === id ? { ...h, categoryId: undefined } : h))
  }, [user, supabase])

  return {
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
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
