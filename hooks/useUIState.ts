'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  UserUIState,
  DEFAULT_UI_STATE,
  ViewId,
  SectionViewMode,
  TemporalSectionId,
  formatDateKey,
} from '@/lib/types'

const STORAGE_KEY = 'vibe-ui-state'
const SYNC_DEBOUNCE_MS = 1000

export function useUIState() {
  const [state, setState] = useState<UserUIState>(DEFAULT_UI_STATE)
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  const { user } = useAuth()
  const supabase = createClient()
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdateRef = useRef<Partial<UserUIState> | null>(null)

  // Load state from localStorage first (fast), then from Supabase (authoritative)
  useEffect(() => {
    // Load from localStorage immediately for fast UX
    if (typeof window === 'undefined' || isHydrated) return

    const hydrateTimeout = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<UserUIState>
          setState(prev => ({ ...prev, ...parsed }))
        }
      } catch (e) {
        console.error('Error loading UI state from localStorage:', e)
      }
      setIsHydrated(true)
    }, 0)

    return () => clearTimeout(hydrateTimeout)
  }, [isHydrated])

  // Load from Supabase when user is authenticated
  useEffect(() => {
    let isActive = true
    const loadFromCloud = async () => {
      if (!user) {
        if (isActive) {
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('user_ui_state')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (new user)
        console.error('Error loading UI state:', error)
      }

      if (data && isActive) {
        const cloudState: UserUIState = {
          activeView: (data.active_view as ViewId) || DEFAULT_UI_STATE.activeView,
          widgetStates: (data.widget_states as Record<string, { collapsed: boolean }>) || {},
          sectionViewModes: (data.section_view_modes as Record<TemporalSectionId, SectionViewMode>) || DEFAULT_UI_STATE.sectionViewModes,
          sectionSelectedDates: (data.section_selected_dates as Record<TemporalSectionId, string>) || DEFAULT_UI_STATE.sectionSelectedDates,
          sidebarCollapsed: data.sidebar_collapsed || false,
        }
        setState(cloudState)

        // Also update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudState))
        }
      }

      if (isActive) {
        setLoading(false)
      }
    }

    loadFromCloud()
    return () => {
      isActive = false
    }
  }, [user, supabase])

  // Debounced sync to Supabase
  const syncToCloud = useCallback(async (updates: Partial<UserUIState>) => {
    if (!user) return

    // Merge pending updates
    pendingUpdateRef.current = {
      ...pendingUpdateRef.current,
      ...updates,
    }

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Set new debounced sync
    syncTimeoutRef.current = setTimeout(async () => {
      const updateData = pendingUpdateRef.current
      if (!updateData) return
      pendingUpdateRef.current = null

      const dbData: Record<string, unknown> = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }

      if (updateData.activeView !== undefined) {
        dbData.active_view = updateData.activeView
      }
      if (updateData.widgetStates !== undefined) {
        dbData.widget_states = updateData.widgetStates
      }
      if (updateData.sectionViewModes !== undefined) {
        dbData.section_view_modes = updateData.sectionViewModes
      }
      if (updateData.sectionSelectedDates !== undefined) {
        dbData.section_selected_dates = updateData.sectionSelectedDates
      }
      if (updateData.sidebarCollapsed !== undefined) {
        dbData.sidebar_collapsed = updateData.sidebarCollapsed
      }

      const { error } = await supabase
        .from('user_ui_state')
        .upsert(dbData, { onConflict: 'user_id' })

      if (error) {
        console.error('Error syncing UI state:', error)
      }
    }, SYNC_DEBOUNCE_MS)
  }, [user, supabase])

  // Update state and sync
  const updateState = useCallback((updates: Partial<UserUIState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates }

      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      }

      return newState
    })

    // Sync to cloud (debounced)
    syncToCloud(updates)
  }, [syncToCloud])

  // Specific update functions
  const setActiveView = useCallback((view: ViewId) => {
    updateState({ activeView: view })
  }, [updateState])

  const setWidgetCollapsed = useCallback((widgetId: string, collapsed: boolean) => {
    setState(prev => {
      const newWidgetStates = {
        ...prev.widgetStates,
        [widgetId]: { collapsed },
      }
      const newState = { ...prev, widgetStates: newWidgetStates }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      }

      return newState
    })

    // Need to sync the full widget states
    setState(prev => {
      syncToCloud({ widgetStates: prev.widgetStates })
      return prev
    })
  }, [syncToCloud])

  const toggleWidgetCollapsed = useCallback((widgetId: string) => {
    setState(prev => {
      const currentCollapsed = prev.widgetStates[widgetId]?.collapsed || false
      const newWidgetStates = {
        ...prev.widgetStates,
        [widgetId]: { collapsed: !currentCollapsed },
      }
      const newState = { ...prev, widgetStates: newWidgetStates }

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      }

      syncToCloud({ widgetStates: newWidgetStates })
      return newState
    })
  }, [syncToCloud])

  const setSectionViewMode = useCallback((section: TemporalSectionId, mode: SectionViewMode) => {
    updateState({
      sectionViewModes: {
        ...state.sectionViewModes,
        [section]: mode,
      },
    })
  }, [updateState, state.sectionViewModes])

  const setSectionSelectedDate = useCallback((section: TemporalSectionId, date: string) => {
    updateState({
      sectionSelectedDates: {
        ...state.sectionSelectedDates,
        [section]: date,
      },
    })
  }, [updateState, state.sectionSelectedDates])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    updateState({ sidebarCollapsed: collapsed })
  }, [updateState])

  const toggleSidebarCollapsed = useCallback(() => {
    updateState({ sidebarCollapsed: !state.sidebarCollapsed })
  }, [updateState, state.sidebarCollapsed])

  // Check if a widget is collapsed
  const isWidgetCollapsed = useCallback((widgetId: string): boolean => {
    return state.widgetStates[widgetId]?.collapsed || false
  }, [state.widgetStates])

  // Get section view mode
  const getSectionViewMode = useCallback((section: TemporalSectionId): SectionViewMode => {
    return state.sectionViewModes[section] || 'list'
  }, [state.sectionViewModes])

  // Get section selected date
  const getSectionSelectedDate = useCallback((section: TemporalSectionId): string => {
    return state.sectionSelectedDates[section] || formatDateKey()
  }, [state.sectionSelectedDates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    activeView: state.activeView,
    widgetStates: state.widgetStates,
    sectionViewModes: state.sectionViewModes,
    sectionSelectedDates: state.sectionSelectedDates,
    sidebarCollapsed: state.sidebarCollapsed,
    loading,
    isHydrated,

    // Actions
    setActiveView,
    setWidgetCollapsed,
    toggleWidgetCollapsed,
    isWidgetCollapsed,
    setSectionViewMode,
    getSectionViewMode,
    setSectionSelectedDate,
    getSectionSelectedDate,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
  }
}
