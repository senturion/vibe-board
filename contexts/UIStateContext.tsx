'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useUIState } from '@/hooks/useUIState'
import {
  ViewId,
  SectionViewMode,
  TemporalSectionId,
} from '@/lib/types'

interface UIStateContextType {
  // State
  activeView: ViewId
  widgetStates: Record<string, { collapsed: boolean }>
  sectionViewModes: Record<TemporalSectionId, SectionViewMode>
  sectionSelectedDates: Record<TemporalSectionId, string>
  sidebarCollapsed: boolean
  loading: boolean
  isHydrated: boolean

  // Actions
  setActiveView: (view: ViewId) => void
  setWidgetCollapsed: (widgetId: string, collapsed: boolean) => void
  toggleWidgetCollapsed: (widgetId: string) => void
  isWidgetCollapsed: (widgetId: string) => boolean
  setSectionViewMode: (section: TemporalSectionId, mode: SectionViewMode) => void
  getSectionViewMode: (section: TemporalSectionId) => SectionViewMode
  setSectionSelectedDate: (section: TemporalSectionId, date: string) => void
  getSectionSelectedDate: (section: TemporalSectionId) => string
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
}

const UIStateContext = createContext<UIStateContextType | null>(null)

export function UIStateProvider({ children }: { children: ReactNode }) {
  const uiState = useUIState()

  return (
    <UIStateContext.Provider value={uiState}>
      {children}
    </UIStateContext.Provider>
  )
}

export function useUIStateContext() {
  const context = useContext(UIStateContext)
  if (!context) {
    throw new Error('useUIStateContext must be used within a UIStateProvider')
  }
  return context
}
