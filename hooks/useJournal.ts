'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  JournalEntry,
  JournalPrompt,
  formatDateKey,
  countWords,
  DEFAULT_JOURNAL_PROMPTS,
} from '@/lib/types'

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [prompts, setPrompts] = useState<JournalPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch entries and prompts
  useEffect(() => {
    if (!user) {
      setEntries([])
      setPrompts([])
      setLoading(false)
      return
    }

    const fetchData = async () => {
      // Fetch entries (last 365 days)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const { data: entriesData, error: entriesError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', formatDateKey(oneYearAgo))
        .order('entry_date', { ascending: false })

      if (entriesError) {
        console.error('Error fetching entries:', entriesError)
      }

      // Fetch prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('journal_prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (promptsError) {
        console.error('Error fetching prompts:', promptsError)
      }

      // Map entries
      const mappedEntries: JournalEntry[] = (entriesData || []).map(e => ({
        id: e.id,
        entryDate: e.entry_date,
        content: e.content,
        mood: e.mood || undefined,
        moodEmoji: e.mood_emoji || undefined,
        tags: e.tags || [],
        isFavorite: e.is_favorite,
        wordCount: e.word_count,
        createdAt: new Date(e.created_at).getTime(),
        updatedAt: new Date(e.updated_at).getTime(),
      }))

      // Map prompts
      const mappedPrompts: JournalPrompt[] = (promptsData || []).map(p => ({
        id: p.id,
        promptText: p.prompt_text,
        isActive: p.is_active,
        order: p.order,
        createdAt: new Date(p.created_at).getTime(),
      }))

      setEntries(mappedEntries)
      setPrompts(mappedPrompts)
      setLoading(false)
    }

    fetchData()
  }, [user, supabase])

  // Get entry for a specific date
  const getEntry = useCallback((date: Date): JournalEntry | null => {
    const dateKey = formatDateKey(date)
    return entries.find(e => e.entryDate === dateKey) || null
  }, [entries])

  // Get today's entry
  const getTodaysEntry = useCallback(() => {
    return getEntry(new Date())
  }, [getEntry])

  // Create or update entry (debounced)
  const saveEntry = useCallback(async (
    date: Date,
    content: string,
    mood?: number,
    moodIcon?: string
  ) => {
    if (!user) return

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const dateKey = formatDateKey(date)
    const wordCount = countWords(content)
    const existingEntry = entries.find(e => e.entryDate === dateKey)

    // Optimistic update
    if (existingEntry) {
      setEntries(prev => prev.map(e =>
        e.entryDate === dateKey
          ? { ...e, content, mood, moodEmoji: moodIcon, wordCount, updatedAt: Date.now() }
          : e
      ))
    } else {
      const newEntry: JournalEntry = {
        id: `temp-${dateKey}`,
        entryDate: dateKey,
        content,
        mood,
        moodEmoji: moodIcon,
        tags: [],
        isFavorite: false,
        wordCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setEntries(prev => [newEntry, ...prev])
    }

    // Debounced save to database
    saveTimeoutRef.current = setTimeout(async () => {
      if (existingEntry) {
        const { error } = await supabase
          .from('journal_entries')
          .update({
            content,
            mood: mood || null,
            mood_emoji: moodIcon || null,
            word_count: wordCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEntry.id)

        if (error) {
          console.error('Error updating entry:', error)
        }
      } else {
        const { data, error } = await supabase
          .from('journal_entries')
          .upsert({
            user_id: user.id,
            entry_date: dateKey,
            content,
            mood: mood || null,
            mood_emoji: moodIcon || null,
            word_count: wordCount,
          }, {
            onConflict: 'user_id,entry_date',
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating entry:', error)
        } else if (data) {
          // Update with real ID
          setEntries(prev => prev.map(e =>
            e.entryDate === dateKey
              ? { ...e, id: data.id }
              : e
          ))
        }
      }
    }, 500)
  }, [user, supabase, entries])

  // Delete entry
  const deleteEntry = useCallback(async (date: Date) => {
    if (!user) return

    const dateKey = formatDateKey(date)
    const entry = entries.find(e => e.entryDate === dateKey)
    if (!entry || entry.id.startsWith('temp-')) return

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entry.id)

    if (error) {
      console.error('Error deleting entry:', error)
      return
    }

    setEntries(prev => prev.filter(e => e.entryDate !== dateKey))
  }, [user, supabase, entries])

  // Toggle favorite
  const toggleFavorite = useCallback(async (entryId: string) => {
    if (!user) return

    const entry = entries.find(e => e.id === entryId)
    if (!entry) return

    const newValue = !entry.isFavorite

    // Optimistic update
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, isFavorite: newValue } : e
    ))

    const { error } = await supabase
      .from('journal_entries')
      .update({ is_favorite: newValue })
      .eq('id', entryId)

    if (error) {
      console.error('Error toggling favorite:', error)
      // Revert on error
      setEntries(prev => prev.map(e =>
        e.id === entryId ? { ...e, isFavorite: !newValue } : e
      ))
    }
  }, [user, supabase, entries])

  // Update mood for an entry
  const updateMood = useCallback(async (entryId: string, mood: number, moodIcon?: string) => {
    if (!user) return

    // Optimistic update
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, mood, moodEmoji: moodIcon } : e
    ))

    const { error } = await supabase
      .from('journal_entries')
      .update({ mood, mood_emoji: moodIcon || null })
      .eq('id', entryId)

    if (error) {
      console.error('Error updating mood:', error)
    }
  }, [user, supabase])

  // Add prompt
  const addPrompt = useCallback(async (text: string) => {
    if (!user) return ''

    const order = prompts.length
    const { data, error } = await supabase
      .from('journal_prompts')
      .insert({
        user_id: user.id,
        prompt_text: text,
        order,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating prompt:', error)
      return ''
    }

    const newPrompt: JournalPrompt = {
      id: data.id,
      promptText: data.prompt_text,
      isActive: data.is_active,
      order: data.order,
      createdAt: new Date(data.created_at).getTime(),
    }

    setPrompts(prev => [...prev, newPrompt])
    return newPrompt.id
  }, [user, supabase])

  // Delete prompt
  const deletePrompt = useCallback(async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('journal_prompts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting prompt:', error)
      return
    }

    setPrompts(prev => prev.filter(p => p.id !== id))
  }, [user, supabase])

  // Get random prompt
  const getRandomPrompt = useCallback(() => {
    const activePrompts = prompts.filter(p => p.isActive)
    const allPrompts = activePrompts.length > 0
      ? activePrompts.map(p => p.promptText)
      : DEFAULT_JOURNAL_PROMPTS

    return allPrompts[Math.floor(Math.random() * allPrompts.length)]
  }, [prompts])

  // Search entries
  const searchEntries = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()
    return entries.filter(e =>
      e.content.toLowerCase().includes(lowerQuery)
    )
  }, [entries])

  // Get entries by month
  const getEntriesByMonth = useCallback((year: number, month: number) => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`
    return entries.filter(e => e.entryDate >= startDate && e.entryDate <= endDate)
  }, [entries])

  // Get favorites
  const getFavorites = useCallback(() => {
    return entries.filter(e => e.isFavorite)
  }, [entries])

  // Get mood trend (last N days)
  const getMoodTrend = useCallback((days: number = 30) => {
    const today = new Date()
    const result: { date: string; mood: number | null }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = formatDateKey(date)
      const entry = entries.find(e => e.entryDate === dateKey)

      result.push({
        date: dateKey,
        mood: entry?.mood || null,
      })
    }

    return result
  }, [entries])

  // Get writing stats
  const getWritingStats = useCallback(() => {
    const totalEntries = entries.length
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0)

    // Calculate streak
    let streak = 0
    const today = new Date()
    for (let i = 0; ; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = formatDateKey(date)
      if (entries.some(e => e.entryDate === dateKey)) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    return {
      totalEntries,
      totalWords,
      streak,
    }
  }, [entries])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    entries,
    prompts,
    loading,
    getEntry,
    getTodaysEntry,
    saveEntry,
    deleteEntry,
    toggleFavorite,
    updateMood,
    addPrompt,
    deletePrompt,
    getRandomPrompt,
    searchEntries,
    getEntriesByMonth,
    getFavorites,
    getMoodTrend,
    getWritingStats,
  }
}
