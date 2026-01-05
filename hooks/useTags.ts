'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Tag, TagCategory, LABELS, TAG_COLORS } from '@/lib/types'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [categories, setCategories] = useState<TagCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const { user } = useAuth()
  const supabase = createClient()

  // Fetch tags and categories
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('tag_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (categoriesError) {
        console.error('Error fetching tag categories:', categoriesError)
      }

      // Fetch tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (tagsError) {
        console.error('Error fetching tags:', tagsError)
      }

      if (categoriesData) {
        const mappedCategories: TagCategory[] = categoriesData.map(c => ({
          id: c.id,
          name: c.name,
          order: c.order,
          createdAt: new Date(c.created_at).getTime(),
        }))
        setCategories(mappedCategories)
      }

      if (tagsData) {
        const mappedTags: Tag[] = tagsData.map(t => ({
          id: t.id,
          categoryId: t.category_id || undefined,
          name: t.name,
          color: t.color,
          bgColor: t.bg_color,
          order: t.order,
          createdAt: new Date(t.created_at).getTime(),
        }))
        setTags(mappedTags)
      }

      // Initialize with default tags if none exist
      if ((!tagsData || tagsData.length === 0) && !initialized) {
        await initializeDefaultTags()
        setInitialized(true)
      }

      setLoading(false)
    }

    fetchData()
  }, [user, supabase, initialized])

  // Initialize default tags from LABELS
  const initializeDefaultTags = useCallback(async () => {
    if (!user) return

    // Create "Type" category for default labels
    const { data: categoryData, error: categoryError } = await supabase
      .from('tag_categories')
      .insert({
        user_id: user.id,
        name: 'Type',
        order: 0,
      })
      .select()
      .single()

    if (categoryError) {
      console.error('Error creating default category:', categoryError)
      return
    }

    // Create tags from LABELS
    const tagsToCreate = LABELS.map((label, index) => ({
      user_id: user.id,
      category_id: categoryData.id,
      name: label.label,
      color: label.color,
      bg_color: label.bg,
      order: index,
    }))

    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .insert(tagsToCreate)
      .select()

    if (tagsError) {
      console.error('Error creating default tags:', tagsError)
      return
    }

    // Update local state
    if (categoryData) {
      setCategories([{
        id: categoryData.id,
        name: categoryData.name,
        order: categoryData.order,
        createdAt: new Date(categoryData.created_at).getTime(),
      }])
    }

    if (tagsData) {
      const mappedTags: Tag[] = tagsData.map(t => ({
        id: t.id,
        categoryId: t.category_id || undefined,
        name: t.name,
        color: t.color,
        bgColor: t.bg_color,
        order: t.order,
        createdAt: new Date(t.created_at).getTime(),
      }))
      setTags(mappedTags)
    }
  }, [user, supabase])

  // Add category
  const addCategory = useCallback(async (name: string): Promise<TagCategory | null> => {
    if (!user) return null

    const maxOrder = Math.max(...categories.map(c => c.order), -1)

    const { data, error } = await supabase
      .from('tag_categories')
      .insert({
        user_id: user.id,
        name,
        order: maxOrder + 1,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding category:', error)
      return null
    }

    const newCategory: TagCategory = {
      id: data.id,
      name: data.name,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setCategories(prev => [...prev, newCategory])
    return newCategory
  }, [user, supabase, categories])

  // Update category
  const updateCategory = useCallback(async (categoryId: string, updates: Partial<Pick<TagCategory, 'name' | 'order'>>) => {
    if (!user) return

    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, ...updates } : c
    ))

    const { error } = await supabase
      .from('tag_categories')
      .update(updates)
      .eq('id', categoryId)

    if (error) {
      console.error('Error updating category:', error)
    }
  }, [user, supabase])

  // Delete category
  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!user) return

    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    setCategories(prev => prev.filter(c => c.id !== categoryId))
    // Tags in this category will have their category_id set to null by DB cascade

    setTags(prev => prev.map(t =>
      t.categoryId === categoryId ? { ...t, categoryId: undefined } : t
    ))

    const { error } = await supabase
      .from('tag_categories')
      .delete()
      .eq('id', categoryId)

    if (error) {
      console.error('Error deleting category:', error)
      setCategories(prev => [...prev, category])
    }
  }, [user, supabase, categories])

  // Add tag
  const addTag = useCallback(async (
    name: string,
    color: string,
    bgColor: string,
    categoryId?: string
  ): Promise<Tag | null> => {
    if (!user) return null

    const maxOrder = Math.max(...tags.map(t => t.order), -1)

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        category_id: categoryId || null,
        name,
        color,
        bg_color: bgColor,
        order: maxOrder + 1,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding tag:', error)
      return null
    }

    const newTag: Tag = {
      id: data.id,
      categoryId: data.category_id || undefined,
      name: data.name,
      color: data.color,
      bgColor: data.bg_color,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setTags(prev => [...prev, newTag])
    return newTag
  }, [user, supabase, tags])

  // Update tag
  const updateTag = useCallback(async (
    tagId: string,
    updates: Partial<Pick<Tag, 'name' | 'color' | 'bgColor' | 'categoryId' | 'order'>>
  ) => {
    if (!user) return

    setTags(prev => prev.map(t =>
      t.id === tagId ? { ...t, ...updates } : t
    ))

    const dbUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.color !== undefined) dbUpdates.color = updates.color
    if (updates.bgColor !== undefined) dbUpdates.bg_color = updates.bgColor
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId || null
    if (updates.order !== undefined) dbUpdates.order = updates.order

    const { error } = await supabase
      .from('tags')
      .update(dbUpdates)
      .eq('id', tagId)

    if (error) {
      console.error('Error updating tag:', error)
    }
  }, [user, supabase])

  // Delete tag
  const deleteTag = useCallback(async (tagId: string) => {
    if (!user) return

    const tag = tags.find(t => t.id === tagId)
    if (!tag) return

    setTags(prev => prev.filter(t => t.id !== tagId))

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)

    if (error) {
      console.error('Error deleting tag:', error)
      setTags(prev => [...prev, tag])
    }
  }, [user, supabase, tags])

  // Get tags by category
  const getTagsByCategory = useCallback((categoryId?: string): Tag[] => {
    if (categoryId) {
      return tags.filter(t => t.categoryId === categoryId)
    }
    return tags.filter(t => !t.categoryId) // uncategorized
  }, [tags])

  // Get tag by id
  const getTagById = useCallback((tagId: string): Tag | undefined => {
    return tags.find(t => t.id === tagId)
  }, [tags])

  // Get tags for a task (by tag IDs)
  const getTagsForTask = useCallback((tagIds: string[]): Tag[] => {
    return tags.filter(t => tagIds.includes(t.id))
  }, [tags])

  // Add tag to task
  const addTagToTask = useCallback(async (taskId: string, tagId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('task_tags')
      .insert({ task_id: taskId, tag_id: tagId })

    if (error && error.code !== '23505') { // ignore duplicate key error
      console.error('Error adding tag to task:', error)
    }
  }, [user, supabase])

  // Remove tag from task
  const removeTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId)

    if (error) {
      console.error('Error removing tag from task:', error)
    }
  }, [user, supabase])

  // Get task tag IDs
  const getTaskTagIds = useCallback(async (taskId: string): Promise<string[]> => {
    if (!user) return []

    const { data, error } = await supabase
      .from('task_tags')
      .select('tag_id')
      .eq('task_id', taskId)

    if (error) {
      console.error('Error fetching task tags:', error)
      return []
    }

    return data?.map(d => d.tag_id) || []
  }, [user, supabase])

  // Set task tags (replace all)
  const setTaskTags = useCallback(async (taskId: string, tagIds: string[]) => {
    if (!user) return

    // Delete existing
    await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)

    // Insert new
    if (tagIds.length > 0) {
      const { error } = await supabase
        .from('task_tags')
        .insert(tagIds.map(tagId => ({ task_id: taskId, tag_id: tagId })))

      if (error) {
        console.error('Error setting task tags:', error)
      }
    }
  }, [user, supabase])

  return {
    // Data
    tags,
    categories,
    loading,

    // Category operations
    addCategory,
    updateCategory,
    deleteCategory,

    // Tag operations
    addTag,
    updateTag,
    deleteTag,
    getTagsByCategory,
    getTagById,
    getTagsForTask,

    // Task-tag operations
    addTagToTask,
    removeTagFromTask,
    getTaskTagIds,
    setTaskTags,
  }
}
