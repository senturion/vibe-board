'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Goal,
  GoalCategory,
  Milestone,
  GoalTaskLink,
  GoalStatus,
  GoalPriority,
  formatDateKey,
} from '@/lib/types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] = useState<GoalCategory[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [taskLinks, setTaskLinks] = useState<GoalTaskLink[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch goals, categories, milestones, and task links
  useEffect(() => {
    let isActive = true
    const fetchData = async () => {
      if (!user) {
        if (isActive) {
          setGoals([])
          setCategories([])
          setMilestones([])
          setTaskLinks([])
          setLoading(false)
        }
        return
      }
      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('order', { ascending: true })

      if (goalsError) {
        console.error('Error fetching goals:', goalsError)
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('goal_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      }

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (milestonesError) {
        console.error('Error fetching milestones:', milestonesError)
      }

      // Fetch task links
      const { data: taskLinksData, error: taskLinksError } = await supabase
        .from('goal_task_links')
        .select('*')
        .eq('user_id', user.id)

      if (taskLinksError) {
        console.error('Error fetching task links:', taskLinksError)
      }

      // Map goals
      const mappedGoals: Goal[] = (goalsData || []).map(g => ({
        id: g.id,
        categoryId: g.category_id || undefined,
        title: g.title,
        description: g.description || undefined,
        targetDate: g.target_date || undefined,
        startDate: g.start_date,
        status: g.status as GoalStatus,
        progress: g.progress,
        priority: g.priority as GoalPriority,
        order: g.order,
        createdAt: new Date(g.created_at).getTime(),
        completedAt: g.completed_at ? new Date(g.completed_at).getTime() : undefined,
        archivedAt: g.archived_at ? new Date(g.archived_at).getTime() : undefined,
      }))

      // Map categories
      const mappedCategories: GoalCategory[] = (categoriesData || []).map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon || undefined,
        order: c.order,
        createdAt: new Date(c.created_at).getTime(),
      }))

      // Map milestones
      const mappedMilestones: Milestone[] = (milestonesData || []).map(m => ({
        id: m.id,
        goalId: m.goal_id,
        title: m.title,
        description: m.description || undefined,
        targetDate: m.target_date || undefined,
        isCompleted: m.is_completed,
        completedAt: m.completed_at ? new Date(m.completed_at).getTime() : undefined,
        order: m.order,
        createdAt: new Date(m.created_at).getTime(),
      }))

      // Map task links
      const mappedTaskLinks: GoalTaskLink[] = (taskLinksData || []).map(l => ({
        id: l.id,
        goalId: l.goal_id,
        taskId: l.task_id,
        createdAt: new Date(l.created_at).getTime(),
      }))

      if (isActive) {
        setGoals(mappedGoals)
        setCategories(mappedCategories)
        setMilestones(mappedMilestones)
        setTaskLinks(mappedTaskLinks)
        setLoading(false)
      }
    }

    fetchData()
    return () => {
      isActive = false
    }
  }, [user, supabase, milestones])

  // Add a new goal
  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt' | 'order'>) => {
    if (!user) return ''

    const order = goals.length
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        category_id: goal.categoryId || null,
        title: goal.title,
        description: goal.description || null,
        target_date: goal.targetDate || null,
        start_date: goal.startDate,
        status: goal.status,
        progress: goal.progress,
        priority: goal.priority,
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating goal:', error)
      return ''
    }

    const newGoal: Goal = {
      id: data.id,
      categoryId: data.category_id || undefined,
      title: data.title,
      description: data.description || undefined,
      targetDate: data.target_date || undefined,
      startDate: data.start_date,
      status: data.status as GoalStatus,
      progress: data.progress,
      priority: data.priority as GoalPriority,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setGoals(prev => [...prev, newGoal])
    return newGoal.id
  }, [user, supabase, goals.length])

  // Update a goal
  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    if (!user) return

    const dbUpdates: Record<string, unknown> = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId
    if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority

    if (updates.status === 'completed' && !updates.completedAt) {
      dbUpdates.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('goals')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating goal:', error)
      return
    }

    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
  }, [user, supabase, milestones])

  // Delete a goal
  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting goal:', error)
      return
    }

    setGoals(prev => prev.filter(g => g.id !== id))
    setMilestones(prev => prev.filter(m => m.goalId !== id))
    setTaskLinks(prev => prev.filter(l => l.goalId !== id))
  }, [user, supabase, milestones])

  // Archive a goal
  const archiveGoal = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('goals')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error archiving goal:', error)
      return
    }

    setGoals(prev => prev.filter(g => g.id !== id))
  }, [user, supabase, milestones])

  // Complete a goal
  const completeGoal = useCallback(async (id: string) => {
    await updateGoal(id, {
      status: 'completed',
      progress: 100,
      completedAt: Date.now(),
    })
  }, [updateGoal])

  // Add milestone
  const addMilestone = useCallback(async (goalId: string, title: string, targetDate?: string) => {
    if (!user) return ''

    const order = milestones.filter(m => m.goalId === goalId).length
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        user_id: user.id,
        goal_id: goalId,
        title,
        target_date: targetDate || null,
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating milestone:', error)
      return ''
    }

    const newMilestone: Milestone = {
      id: data.id,
      goalId: data.goal_id,
      title: data.title,
      targetDate: data.target_date || undefined,
      isCompleted: data.is_completed,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setMilestones(prev => [...prev, newMilestone])
    return newMilestone.id
  }, [user, supabase, milestones])

  // Update milestone
  const updateMilestone = useCallback(async (id: string, updates: Partial<Milestone>) => {
    if (!user) return

    const dbUpdates: Record<string, unknown> = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate
    if (updates.isCompleted !== undefined) {
      dbUpdates.is_completed = updates.isCompleted
      if (updates.isCompleted) {
        dbUpdates.completed_at = new Date().toISOString()
      } else {
        dbUpdates.completed_at = null
      }
    }

    const { error } = await supabase
      .from('milestones')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating milestone:', error)
      return
    }

    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [user, supabase, categories.length])

  // Delete milestone
  const deleteMilestone = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting milestone:', error)
      return
    }

    setMilestones(prev => prev.filter(m => m.id !== id))
  }, [user, supabase, categories.length])

  // Toggle milestone completion
  const toggleMilestone = useCallback(async (id: string) => {
    const milestone = milestones.find(m => m.id === id)
    if (!milestone) return

    await updateMilestone(id, { isCompleted: !milestone.isCompleted })

    // Update goal progress based on milestones
    const goalMilestones = milestones.filter(m => m.goalId === milestone.goalId)
    const completedCount = goalMilestones.filter(m =>
      m.id === id ? !milestone.isCompleted : m.isCompleted
    ).length
    const progress = goalMilestones.length > 0
      ? Math.round((completedCount / goalMilestones.length) * 100)
      : 0

    await updateGoal(milestone.goalId, { progress })
  }, [milestones, updateMilestone, updateGoal])

  // Link task to goal
  const linkTask = useCallback(async (goalId: string, taskId: string) => {
    if (!user) return

    // Check if already linked
    if (taskLinks.some(l => l.goalId === goalId && l.taskId === taskId)) return

    const { data, error } = await supabase
      .from('goal_task_links')
      .insert({
        user_id: user.id,
        goal_id: goalId,
        task_id: taskId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error linking task:', error)
      return
    }

    const newLink: GoalTaskLink = {
      id: data.id,
      goalId: data.goal_id,
      taskId: data.task_id,
      createdAt: new Date(data.created_at).getTime(),
    }

    setTaskLinks(prev => [...prev, newLink])
  }, [user, supabase, taskLinks])

  // Unlink task from goal
  const unlinkTask = useCallback(async (goalId: string, taskId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('goal_task_links')
      .delete()
      .eq('goal_id', goalId)
      .eq('task_id', taskId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error unlinking task:', error)
      return
    }

    setTaskLinks(prev => prev.filter(l => !(l.goalId === goalId && l.taskId === taskId)))
  }, [user, supabase, categories.length])

  // Get linked tasks for a goal
  const getLinkedTaskIds = useCallback((goalId: string) => {
    return taskLinks.filter(l => l.goalId === goalId).map(l => l.taskId)
  }, [taskLinks])

  // Get milestones for a goal
  const getMilestones = useCallback((goalId: string) => {
    return milestones.filter(m => m.goalId === goalId).sort((a, b) => a.order - b.order)
  }, [milestones])

  // Calculate progress based on milestones
  const calculateProgress = useCallback((goalId: string) => {
    const goalMilestones = getMilestones(goalId)
    if (goalMilestones.length === 0) return 0
    const completed = goalMilestones.filter(m => m.isCompleted).length
    return Math.round((completed / goalMilestones.length) * 100)
  }, [getMilestones])

  // Get active goals
  const getActiveGoals = useCallback(() => {
    return goals.filter(g => g.status === 'active')
  }, [goals])

  // Get goals by category
  const getGoalsByCategory = useCallback((categoryId: string) => {
    return goals.filter(g => g.categoryId === categoryId)
  }, [goals])

  // Add category
  const addCategory = useCallback(async (name: string, color: string) => {
    if (!user) return ''

    const order = categories.length
    const { data, error } = await supabase
      .from('goal_categories')
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

    const newCategory: GoalCategory = {
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

  // Delete category
  const deleteCategory = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('goal_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting category:', error)
      return
    }

    setCategories(prev => prev.filter(c => c.id !== id))
    setGoals(prev => prev.map(g => g.categoryId === id ? { ...g, categoryId: undefined } : g))
  }, [user, supabase])

  return {
    goals,
    categories,
    milestones,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    archiveGoal,
    completeGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
    linkTask,
    unlinkTask,
    getLinkedTaskIds,
    getMilestones,
    calculateProgress,
    getActiveGoals,
    getGoalsByCategory,
    addCategory,
    deleteCategory,
  }
}
