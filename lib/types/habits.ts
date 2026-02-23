import { DayOfWeek, getCurrentDayOfWeek } from './shared'

export type FrequencyType = 'daily' | 'weekly' | 'specific_days'
export type HabitType = 'build' | 'avoid'
export type TrackingMode = 'manual' | 'auto-complete'

export interface HabitCategory {
  id: string
  name: string
  color: string
  icon?: string
  order: number
  createdAt: number
}

export interface Habit {
  id: string
  categoryId?: string
  name: string
  description?: string
  frequencyType: FrequencyType
  frequencyValue: number // for 'weekly': X times per week
  specificDays?: DayOfWeek[] // for 'specific_days'
  targetCount: number // how many times per day/occasion
  isActive: boolean
  color: string
  icon?: string
  habitType: HabitType
  trackingMode: TrackingMode
  order: number
  createdAt: number
  archivedAt?: number
  category?: HabitCategory
}

export interface HabitCompletion {
  id: string
  habitId: string
  completionDate: string // YYYY-MM-DD
  count: number // supports multiple completions per day
  note?: string
  completedAt: number
}

export interface HabitStreak {
  id: string
  habitId: string
  currentStreak: number
  bestStreak: number
  lastCompletionDate?: string // YYYY-MM-DD
  updatedAt: number
}

export interface HeatmapEntry {
  date: string // YYYY-MM-DD
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface HabitStats {
  totalCompletions: number
  averagePerWeek: number
  currentStreak: number
  bestStreak: number
  completionRate: number
}

export const HABIT_COLORS: string[] = [
  '#e07a5f', '#81b29a', '#f2cc8f', '#3d405b',
  '#f4a261', '#2a9d8f', '#e76f51', '#264653',
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#a855f7',
]

export function isHabitActiveToday(habit: Habit): boolean {
  if (!habit.isActive) return false
  const today = getCurrentDayOfWeek()

  switch (habit.frequencyType) {
    case 'daily':
      return true
    case 'specific_days':
      return habit.specificDays?.includes(today) ?? false
    case 'weekly':
      return true // weekly habits can be completed any day
    default:
      return false
  }
}
