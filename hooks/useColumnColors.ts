'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ColumnId } from '@/lib/types'

// Default column colors
const DEFAULT_COLORS: Record<ColumnId, string> = {
  'backlog': '#888888',
  'todo': '#e07a5f',
  'in-progress': '#4ade80',
  'complete': '#60a5fa',
}
const FALLBACK_COLOR = DEFAULT_COLORS.todo

// Available color palette
export const COLOR_PALETTE = [
  '#888888', // Gray
  '#e07a5f', // Terracotta
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#4ade80', // Green
  '#2dd4bf', // Teal
  '#60a5fa', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
]

export function useColumnColors() {
  const [colors, setColorsState] = useState<Record<ColumnId, string>>(DEFAULT_COLORS)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch colors from Supabase
  useEffect(() => {
    const initColors = async () => {
      // Check localStorage first for immediate display
      const stored = localStorage.getItem('vibe-column-colors')
      if (stored) {
        try {
          setColorsState(JSON.parse(stored))
        } catch {
          // ignore parse error
        }
      }

      // If logged in, fetch from Supabase and sync
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('column_colors')
          .single()

        if (data?.column_colors && typeof data.column_colors === 'object') {
          const serverColors = data.column_colors as Record<ColumnId, string>
          const mergedColors = { ...DEFAULT_COLORS, ...serverColors }
          setColorsState(mergedColors)
          localStorage.setItem('vibe-column-colors', JSON.stringify(mergedColors))
        }
      }
    }

    initColors()
  }, [user, supabase])

  const setColors = useCallback(async (newColors: Record<ColumnId, string>) => {
    setColorsState(newColors)
    localStorage.setItem('vibe-column-colors', JSON.stringify(newColors))

    // Sync to Supabase if logged in
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, column_colors: newColors })
    }
  }, [user, supabase])

  const setColumnColor = useCallback((columnId: ColumnId, color: string) => {
    const newColors = { ...colors, [columnId]: color }
    setColors(newColors)
  }, [colors, setColors])

  const getColumnColor = (columnId: ColumnId): string => {
    return colors[columnId] || DEFAULT_COLORS[columnId] || FALLBACK_COLOR
  }

  const resetColors = useCallback(() => {
    setColors(DEFAULT_COLORS)
  }, [setColors])

  return {
    colors,
    setColumnColor,
    getColumnColor,
    resetColors,
  }
}
