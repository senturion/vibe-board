'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useTags } from '@/hooks/useTags'
import { Tag, TagCategory } from '@/lib/types'

interface TagsContextType {
  // Data
  tags: Tag[]
  categories: TagCategory[]
  loading: boolean

  // Category operations
  addCategory: (name: string) => Promise<TagCategory | null>
  updateCategory: (categoryId: string, updates: Partial<Pick<TagCategory, 'name' | 'order'>>) => Promise<void>
  deleteCategory: (categoryId: string) => Promise<void>

  // Tag operations
  addTag: (name: string, color: string, bgColor: string, categoryId?: string) => Promise<Tag | null>
  updateTag: (tagId: string, updates: Partial<Pick<Tag, 'name' | 'color' | 'bgColor' | 'categoryId' | 'order'>>) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  getTagsByCategory: (categoryId?: string) => Tag[]
  getTagById: (tagId: string) => Tag | undefined
  getTagsForTask: (tagIds: string[]) => Tag[]

  // Task-tag operations
  addTagToTask: (taskId: string, tagId: string) => Promise<void>
  removeTagFromTask: (taskId: string, tagId: string) => Promise<void>
  getTaskTagIds: (taskId: string) => Promise<string[]>
  setTaskTags: (taskId: string, tagIds: string[]) => Promise<void>
}

const TagsContext = createContext<TagsContextType | null>(null)

export function TagsProvider({ children }: { children: ReactNode }) {
  const tagsHook = useTags()

  return (
    <TagsContext.Provider value={tagsHook}>
      {children}
    </TagsContext.Provider>
  )
}

export function useTagsContext() {
  const context = useContext(TagsContext)
  if (!context) {
    throw new Error('useTagsContext must be used within a TagsProvider')
  }
  return context
}
