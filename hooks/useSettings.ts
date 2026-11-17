'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { notifyError } from '@/lib/notify'

export interface AppSettings {
  // General
  theme: 'light' | 'dark'
  /** The view the app opens on. Replaces defaultView, which nothing read. */
  startView: ViewId
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
  startView: 'today',
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

export const settingsQueryKey = (userId: string | undefined) => ['settings', userId ?? 'signed-out'] as const

// The copy saved on this device, shown instantly while the cloud copy loads.
// Parsed once per distinct stored string so the snapshot stays referentially stable.
let cachedRaw: string | null = null
let cachedLocal: AppSettings = DEFAULT_SETTINGS

function readLocalSettings(): AppSettings {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(SETTINGS_KEY)
  } catch {
    return DEFAULT_SETTINGS
  }
  if (raw === cachedRaw) return cachedLocal
  cachedRaw = raw
  try {
    cachedLocal = raw ? normalizeSettings(JSON.parse(raw) as unknown) : DEFAULT_SETTINGS
  } catch {
    cachedLocal = DEFAULT_SETTINGS
  }
  return cachedLocal
}

function writeLocalSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable (private mode); the in-memory copy still works.
  }
}

const subscribeToNothing = () => () => {}
const getServerSettings = () => DEFAULT_SETTINGS

/**
 * App settings, shared by every component that reads them: one fetch per
 * session, and a change made anywhere is seen everywhere.
 */
export function useSettings() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = settingsQueryKey(user?.id)

  // Safe to read during render: on the server and during hydration this
  // returns the defaults, then switches to the device copy.
  const localSettings = useSyncExternalStore(subscribeToNothing, readLocalSettings, getServerSettings)

  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<AppSettings> => {
      const local = readLocalSettings()
      const { data, error } = await supabase
        .from('user_settings')
        .select('app_settings')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data?.app_settings) return local

      const cloudSettings = normalizeSettings(data.app_settings)
      const merged = {
        ...cloudSettings,
        // Keep API key local to this device.
        aiApiKey: local.aiApiKey || cloudSettings.aiApiKey,
      }
      writeLocalSettings(merged)
      return merged
    },
  })

  const settings = query.data ?? localSettings
  const loading = !!user && query.isPending

  const save = useCallback((next: AppSettings) => {
    queryClient.setQueryData(queryKey, next)
    writeLocalSettings(next)

    if (!user) return
    supabase
      .from('user_settings')
      .upsert({ user_id: user.id, app_settings: toCloudSettings(next) }, { onConflict: 'user_id' })
      .then(({ error }) => {
        if (error) {
          console.error('Error saving settings:', error)
          notifyError('Could not save settings. They are kept on this device only for now.')
        }
      })
    // queryKey is derived from user.id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, supabase, user])

  const current = useCallback(
    () => queryClient.getQueryData<AppSettings>(queryKey) ?? readLocalSettings(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, user],
  )

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    save({ ...current(), [key]: value })
  }, [save, current])

  // Update multiple settings at once
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    save({ ...current(), ...updates })
  }, [save, current])

  // Reset all settings to defaults
  const resetSettings = useCallback(() => {
    save(DEFAULT_SETTINGS)
  }, [save])

  return {
    settings,
    loading,
    updateSetting,
    updateSettings,
    resetSettings,
  }
}
