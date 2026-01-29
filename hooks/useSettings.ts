'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ViewId, WorkLocation, DayOfWeek } from '@/lib/types'
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
}

export const DEFAULT_SETTINGS: AppSettings = {
  // General
  theme: 'dark',
  defaultView: 'dashboard',
  weekStartsOn: 'monday',

  // Board/Kanban
  compactCards: false,
  showArchivedTasks: false,
  autoArchiveCompleted: false,
  archiveAfterDays: 7,
  expandSubtasksByDefault: false,

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
}

const SETTINGS_KEY = 'vibe-app-settings'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Load settings from localStorage first, then sync with Supabase
  useEffect(() => {
    let isActive = true

    const loadSettings = async () => {
      // Load from localStorage for instant access
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (isActive) {
            setSettings({ ...DEFAULT_SETTINGS, ...parsed })
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
          const cloudSettings = { ...DEFAULT_SETTINGS, ...(data.app_settings as Record<string, unknown>) } as AppSettings
          setSettings(cloudSettings)
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(cloudSettings))
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
            app_settings: newSettings,
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
            app_settings: newSettings,
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
          app_settings: DEFAULT_SETTINGS as unknown as Json,
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
