'use client'

import { useLocalStorage } from './useLocalStorage'
import { ColumnId } from '@/lib/types'

// Default column colors
const DEFAULT_COLORS: Record<ColumnId, string> = {
  'backlog': '#888888',
  'todo': '#e07a5f',
  'in-progress': '#4ade80',
  'complete': '#60a5fa',
}

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
  const [colors, setColors] = useLocalStorage<Record<ColumnId, string>>('vibe-column-colors', DEFAULT_COLORS)

  const setColumnColor = (columnId: ColumnId, color: string) => {
    setColors(prev => ({
      ...prev,
      [columnId]: color,
    }))
  }

  const getColumnColor = (columnId: ColumnId): string => {
    return colors[columnId] || DEFAULT_COLORS[columnId]
  }

  const resetColors = () => {
    setColors(DEFAULT_COLORS)
  }

  return {
    colors,
    setColumnColor,
    getColumnColor,
    resetColors,
  }
}
