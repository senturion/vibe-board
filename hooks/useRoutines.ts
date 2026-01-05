'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Routine,
  RoutineItem,
  RoutineItemCompletion,
  DayOfWeek,
  WorkLocation,
  formatDateKey,
  getCurrentDayOfWeek,
  isRoutineActiveToday,
} from '@/lib/types'

// Parse PostgreSQL interval to minutes
function parseInterval(interval: string): number {
  // Interval format: "HH:MM:SS" or "00:10:00" for 10 minutes
  const parts = interval.split(':')
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    return hours * 60 + minutes
  }
  return 0
}

// Format minutes to PostgreSQL interval
function formatInterval(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [items, setItems] = useState<RoutineItem[]>([])
  const [completions, setCompletions] = useState<RoutineItemCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch routines, items, and today's completions
  useEffect(() => {
    let isActive = true
    const fetchData = async () => {
      if (!user) {
        if (isActive) {
          setRoutines([])
          setItems([])
          setCompletions([])
          setLoading(false)
        }
        return
      }

      // Fetch routines
      const { data: routinesData, error: routinesError } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (routinesError) {
        console.error('Error fetching routines:', routinesError)
      }

      // Fetch routine items
      const { data: itemsData, error: itemsError } = await supabase
        .from('routine_items')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (itemsError) {
        console.error('Error fetching routine items:', itemsError)
      }

      // Fetch today's completions
      const today = formatDateKey()
      const { data: completionsData, error: completionsError } = await supabase
        .from('routine_item_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completion_date', today)

      if (completionsError) {
        console.error('Error fetching completions:', completionsError)
      }

      // Map routines
      const mappedRoutines: Routine[] = (routinesData || []).map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || undefined,
        daysOfWeek: r.days_of_week as DayOfWeek[],
        location: r.location as WorkLocation | undefined,
        isActive: r.is_active,
        order: r.order,
        createdAt: new Date(r.created_at).getTime(),
      }))

      // Map items
      const mappedItems: RoutineItem[] = (itemsData || []).map(i => ({
        id: i.id,
        routineId: i.routine_id,
        title: i.title,
        targetTime: i.target_time ? parseInterval(i.target_time) : undefined,
        order: i.order,
        createdAt: new Date(i.created_at).getTime(),
      }))

      // Map completions
      const mappedCompletions: RoutineItemCompletion[] = (completionsData || []).map(c => ({
        id: c.id,
        routineItemId: c.routine_item_id,
        completionDate: c.completion_date,
        completedAt: new Date(c.completed_at).getTime(),
        duration: c.duration ? parseInterval(c.duration) : undefined,
      }))

      if (isActive) {
        setRoutines(mappedRoutines)
        setItems(mappedItems)
        setCompletions(mappedCompletions)
        setLoading(false)
      }
    }

    fetchData()
    return () => {
      isActive = false
    }
  }, [user, supabase])

  // Add a new routine
  const addRoutine = useCallback(async (name: string, daysOfWeek: DayOfWeek[], description?: string, location?: WorkLocation) => {
    if (!user) return ''

    const order = routines.length
    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        days_of_week: daysOfWeek,
        location: location || null,
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating routine:', error)
      return ''
    }

    const newRoutine: Routine = {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      daysOfWeek: data.days_of_week as DayOfWeek[],
      location: data.location as WorkLocation | undefined,
      isActive: data.is_active,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setRoutines(prev => [...prev, newRoutine])
    return newRoutine.id
  }, [user, supabase, routines.length])

  // Update a routine
  const updateRoutine = useCallback(async (id: string, updates: Partial<Routine>) => {
    if (!user) return

    const dbUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.daysOfWeek !== undefined) dbUpdates.days_of_week = updates.daysOfWeek
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
    if ('location' in updates) dbUpdates.location = updates.location || null

    const { error } = await supabase
      .from('routines')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating routine:', error)
      return
    }

    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }, [user, supabase, items])

  // Delete a routine
  const deleteRoutine = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting routine:', error)
      return
    }

    setRoutines(prev => prev.filter(r => r.id !== id))
    setItems(prev => prev.filter(i => i.routineId !== id))
  }, [user, supabase, items])

  // Add routine item
  const addRoutineItem = useCallback(async (routineId: string, title: string, targetTime?: number) => {
    if (!user) return ''

    const order = items.filter(i => i.routineId === routineId).length
    const { data, error } = await supabase
      .from('routine_items')
      .insert({
        user_id: user.id,
        routine_id: routineId,
        title,
        target_time: targetTime ? formatInterval(targetTime) : null,
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating routine item:', error)
      return ''
    }

    const newItem: RoutineItem = {
      id: data.id,
      routineId: data.routine_id,
      title: data.title,
      targetTime: data.target_time ? parseInterval(data.target_time) : undefined,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setItems(prev => [...prev, newItem])
    return newItem.id
  }, [user, supabase, items])

  // Update routine item
  const updateRoutineItem = useCallback(async (id: string, updates: Partial<RoutineItem>) => {
    if (!user) return

    const dbUpdates: Record<string, unknown> = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.targetTime !== undefined) dbUpdates.target_time = updates.targetTime ? formatInterval(updates.targetTime) : null

    const { error } = await supabase
      .from('routine_items')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating routine item:', error)
      return
    }

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }, [user, supabase])

  // Delete routine item
  const deleteRoutineItem = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('routine_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting routine item:', error)
      return
    }

    setItems(prev => prev.filter(i => i.id !== id))
    setCompletions(prev => prev.filter(c => c.routineItemId !== id))
  }, [user, supabase])

  // Complete an item for today
  const completeItem = useCallback(async (itemId: string, duration?: number) => {
    if (!user) return

    const today = formatDateKey()

    // Check if already completed
    if (completions.some(c => c.routineItemId === itemId)) return

    const { data, error } = await supabase
      .from('routine_item_completions')
      .insert({
        user_id: user.id,
        routine_item_id: itemId,
        completion_date: today,
        duration: duration ? formatInterval(duration) : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error completing item:', error)
      return
    }

    const newCompletion: RoutineItemCompletion = {
      id: data.id,
      routineItemId: data.routine_item_id,
      completionDate: data.completion_date,
      completedAt: new Date(data.completed_at).getTime(),
      duration: data.duration ? parseInterval(data.duration) : undefined,
    }

    setCompletions(prev => [...prev, newCompletion])
  }, [user, supabase, completions])

  // Uncomplete an item for today
  const uncompleteItem = useCallback(async (itemId: string) => {
    if (!user) return

    const today = formatDateKey()
    const completion = completions.find(
      c => c.routineItemId === itemId && c.completionDate === today
    )

    if (!completion) return

    const { error } = await supabase
      .from('routine_item_completions')
      .delete()
      .eq('id', completion.id)

    if (error) {
      console.error('Error uncompleting item:', error)
      return
    }

    setCompletions(prev => prev.filter(c => c.id !== completion.id))
  }, [user, supabase, completions])

  // Toggle item completion
  const toggleItem = useCallback(async (itemId: string) => {
    const isCompleted = completions.some(c => c.routineItemId === itemId)
    if (isCompleted) {
      await uncompleteItem(itemId)
    } else {
      await completeItem(itemId)
    }
  }, [completions, completeItem, uncompleteItem])

  // Get items for a routine
  const getRoutineItems = useCallback((routineId: string) => {
    return items.filter(i => i.routineId === routineId).sort((a, b) => a.order - b.order)
  }, [items])

  // Get today's routines (optionally filtered by work location)
  const getTodaysRoutines = useCallback((workLocation?: WorkLocation | null) => {
    return routines.filter(routine => {
      // First check if routine is active today (day of week)
      if (!isRoutineActiveToday(routine)) return false

      // If no work location filter provided, show all routines
      if (!workLocation) return true

      // If routine has no location set (both), always show it
      if (!routine.location) return true

      // Otherwise, filter by matching location
      return routine.location === workLocation
    })
  }, [routines])

  // Get routine progress for today
  const getRoutineProgress = useCallback((routineId: string) => {
    const routineItems = getRoutineItems(routineId)
    if (routineItems.length === 0) return { completed: 0, total: 0, percentage: 0, completedItems: [] as string[] }

    const completedItems = routineItems
      .filter(item => completions.some(c => c.routineItemId === item.id))
      .map(item => item.id)

    return {
      completed: completedItems.length,
      total: routineItems.length,
      percentage: Math.round((completedItems.length / routineItems.length) * 100),
      completedItems,
    }
  }, [getRoutineItems, completions])

  // Check if an item is completed today
  const isItemCompleted = useCallback((itemId: string) => {
    return completions.some(c => c.routineItemId === itemId)
  }, [completions])

  return {
    routines,
    items,
    completions,
    loading,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineItem,
    updateRoutineItem,
    deleteRoutineItem,
    completeItem,
    uncompleteItem,
    toggleItem,
    getRoutineItems,
    getTodaysRoutines,
    getRoutineProgress,
    isItemCompleted,
  }
}
