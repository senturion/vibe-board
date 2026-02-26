'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  COLUMNS,
  ColumnId,
  DayOfWeek,
  GoalPlannerProvider,
  KanbanColumn,
  ViewId,
  WorkLocation,
  normalizeColumnId,
  normalizeColumnTitle,
} from '@/lib/types'
import type { Json } from '@/lib/supabase/types'

export interface AppSettings {
  // General
  theme: 'light' | 'dark'
  defaultView: ViewId
  weekStartsOn: 'monday' | 'sunday'

  // Board/Kanban
  compactCards: boolean
  showArchivedTasks: boolean
  autoArchiveCompleted: boolean
  archiveAfterDays: number
  expandSubtasksByDefault: boolean
  boardCustomColumns: Record<string, KanbanColumn[]>
  boardColumnOrder: Record<string, ColumnId[]>

  // Work Location
  defaultWorkSchedule: Record<DayOfWeek, WorkLocation | null>

  // Habits
  habitDefaultTarget: number
  showStreakNotifications: boolean
  habitReminderTime: string | null // HH:MM format

  // Routines
  routineAutoComplete: boolean
  showRoutineTimeEstimates: boolean
  routineReminderEnabled: boolean

  // Journal
  journalPromptsEnabled: boolean
  journalAutoSave: boolean
  journalAutoSaveInterval: number // seconds
  defaultMoodTracking: boolean

  // Focus Timer
  focusSoundEnabled: boolean
  focusSoundVolume: number
  focusAutoStartBreaks: boolean
  focusAutoStartWork: boolean
  focusWorkDuration: number
  focusShortBreakDuration: number
  focusLongBreakDuration: number
  focusSessionsUntilLongBreak: number

  // Calendar
  calendarShowWeekends: boolean
  calendarDefaultMonthView: boolean

  // AI
  aiProvider: GoalPlannerProvider
  aiModel: string
  aiApiBaseUrl: string
  aiApiKey: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  // General
  theme: 'dark',
  defaultView: 'board',
  weekStartsOn: 'monday',

  // Board/Kanban
  compactCards: false,
  showArchivedTasks: false,
  autoArchiveCompleted: false,
  archiveAfterDays: 7,
  expandSubtasksByDefault: false,
  boardCustomColumns: {},
  boardColumnOrder: {},

  // Work Location
  defaultWorkSchedule: {
    1: null, // Monday
    2: null, // Tuesday
    3: null, // Wednesday
    4: null, // Thursday
    5: null, // Friday
    6: null, // Saturday
    7: null, // Sunday
  },

  // Habits
  habitDefaultTarget: 1,
  showStreakNotifications: true,
  habitReminderTime: null,

  // Routines
  routineAutoComplete: false,
  showRoutineTimeEstimates: true,
  routineReminderEnabled: false,

  // Journal
  journalPromptsEnabled: true,
  journalAutoSave: true,
  journalAutoSaveInterval: 30,
  defaultMoodTracking: true,

  // Focus Timer
  focusSoundEnabled: true,
  focusSoundVolume: 70,
  focusAutoStartBreaks: false,
  focusAutoStartWork: false,
  focusWorkDuration: 25,
  focusShortBreakDuration: 5,
  focusLongBreakDuration: 15,
  focusSessionsUntilLongBreak: 4,

  // Calendar
  calendarShowWeekends: true,
  calendarDefaultMonthView: true,

  // AI
  aiProvider: 'rules',
  aiModel: '',
  aiApiBaseUrl: '',
  aiApiKey: '',
}

const SETTINGS_KEY = 'vibe-app-settings'
const VALID_AI_PROVIDERS: GoalPlannerProvider[] = ['rules', 'openai', 'openai-compatible', 'ollama', 'anthropic']

function normalizeSettings(raw: unknown, base: AppSettings = DEFAULT_SETTINGS): AppSettings {
  const payload = (raw && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}

  const merged = { ...base, ...payload } as AppSettings

  // Backward compatibility with older goal planner keys.
  const legacyProvider = typeof payload.goalPlannerProvider === 'string' ? payload.goalPlannerProvider : ''
  const legacyModel = typeof payload.goalPlannerModel === 'string' ? payload.goalPlannerModel : ''

  const providerCandidate = typeof payload.aiProvider === 'string'
    ? payload.aiProvider
    : legacyProvider
  const normalizedProvider = providerCandidate.trim().toLowerCase()
  merged.aiProvider = VALID_AI_PROVIDERS.includes(normalizedProvider as GoalPlannerProvider)
    ? normalizedProvider as GoalPlannerProvider
    : base.aiProvider

  const modelCandidate = typeof payload.aiModel === 'string'
    ? payload.aiModel
    : legacyModel
  merged.aiModel = modelCandidate.trim().slice(0, 120)

  const baseUrlCandidate = typeof payload.aiApiBaseUrl === 'string' ? payload.aiApiBaseUrl : ''
  merged.aiApiBaseUrl = baseUrlCandidate.trim().slice(0, 240)

  const keyCandidate = typeof payload.aiApiKey === 'string' ? payload.aiApiKey : ''
  merged.aiApiKey = keyCandidate.trim().slice(0, 500)

  const rawBoardCustomColumns = payload.boardCustomColumns
  const reservedColumnIds = new Set(COLUMNS.map((column) => column.id))
  const normalizedBoardColumns: Record<string, KanbanColumn[]> = {}

  if (rawBoardCustomColumns && typeof rawBoardCustomColumns === 'object' && !Array.isArray(rawBoardCustomColumns)) {
    for (const [boardId, rawColumns] of Object.entries(rawBoardCustomColumns as Record<string, unknown>)) {
      if (!boardId || !Array.isArray(rawColumns)) continue
      const seenIds = new Set<string>()
      const parsedColumns: KanbanColumn[] = []

      for (const rawColumn of rawColumns) {
        if (!rawColumn || typeof rawColumn !== 'object' || Array.isArray(rawColumn)) continue
        const candidate = rawColumn as { id?: unknown; title?: unknown }
        const normalizedId = normalizeColumnId(typeof candidate.id === 'string' ? candidate.id : '')
        const normalizedTitle = normalizeColumnTitle(typeof candidate.title === 'string' ? candidate.title : '')

        if (!normalizedId || !normalizedTitle) continue
        if (reservedColumnIds.has(normalizedId) || seenIds.has(normalizedId)) continue

        seenIds.add(normalizedId)
        parsedColumns.push({ id: normalizedId, title: normalizedTitle })
      }

      if (parsedColumns.length > 0) {
        normalizedBoardColumns[boardId] = parsedColumns
      }
    }
  }

  merged.boardCustomColumns = normalizedBoardColumns

  const rawBoardColumnOrder = payload.boardColumnOrder
  const normalizedBoardColumnOrder: Record<string, ColumnId[]> = {}

  if (rawBoardColumnOrder && typeof rawBoardColumnOrder === 'object' && !Array.isArray(rawBoardColumnOrder)) {
    for (const [boardId, rawOrder] of Object.entries(rawBoardColumnOrder as Record<string, unknown>)) {
      if (!boardId || !Array.isArray(rawOrder)) continue
      const seenIds = new Set<string>()
      const parsedOrder: ColumnId[] = []

      for (const rawId of rawOrder) {
        if (typeof rawId !== 'string') continue
        const normalizedId = normalizeColumnId(rawId)
        if (!normalizedId || seenIds.has(normalizedId)) continue
        seenIds.add(normalizedId)
        parsedOrder.push(normalizedId)
      }

      if (parsedOrder.length > 0) {
        normalizedBoardColumnOrder[boardId] = parsedOrder
      }
    }
  }

  merged.boardColumnOrder = normalizedBoardColumnOrder

  return merged
}

function toCloudSettings(settings: AppSettings): Json {
  const cloudSettings = { ...settings } as Record<string, unknown>
  delete cloudSettings.aiApiKey
  return cloudSettings as Json
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Load settings from localStorage first, then sync with Supabase
  useEffect(() => {
    let isActive = true

    const loadSettings = async () => {
      let localSettings = DEFAULT_SETTINGS

      // Load from localStorage for instant access
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as unknown
          localSettings = normalizeSettings(parsed)
          if (isActive) {
            setSettings(localSettings)
          }
        } catch {
          // Invalid JSON, use defaults
        }
      }

      // If user is logged in, fetch from Supabase
      if (user) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('app_settings')
          .eq('user_id', user.id)
          .single()

        if (!error && data?.app_settings && isActive) {
          const cloudSettings = normalizeSettings(data.app_settings)
          const mergedSettings = {
            ...cloudSettings,
            // Keep API key local to this device.
            aiApiKey: localSettings.aiApiKey || cloudSettings.aiApiKey,
          }
          setSettings(mergedSettings)
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings))
        }
      }

      if (isActive) {
        setLoading(false)
      }
    }

    loadSettings()
    return () => {
      isActive = false
    }
  }, [user, supabase])

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value }

      // Save to localStorage immediately
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))

      // Sync to Supabase if logged in
      if (user) {
        supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            app_settings: toCloudSettings(newSettings),
          }, { onConflict: 'user_id' })
          .then(({ error }) => {
            if (error) console.error('Error saving settings:', error)
          })
      }

      return newSettings
    })
  }, [user, supabase])

  // Update multiple settings at once
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates }

      // Save to localStorage immediately
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings))

      // Sync to Supabase if logged in
      if (user) {
        supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            app_settings: toCloudSettings(newSettings),
          }, { onConflict: 'user_id' })
          .then(({ error }) => {
            if (error) console.error('Error saving settings:', error)
          })
      }

      return newSettings
    })
  }, [user, supabase])

  // Reset all settings to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))

    if (user) {
      supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          app_settings: toCloudSettings(DEFAULT_SETTINGS),
        }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) console.error('Error resetting settings:', error)
        })
    }
  }, [user, supabase])

  return {
    settings,
    loading,
    updateSetting,
    updateSettings,
    resetSettings,
  }
}
