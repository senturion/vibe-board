'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import { ViewId } from '@/lib/types'
import { useUIStateContext } from './UIStateContext'
import { useSettings } from '@/hooks/useSettings'

interface NavigationContextType {
  activeView: ViewId
  previousView: ViewId | null
  setActiveView: (view: ViewId) => void
  goBack: () => void
  isTransitioning: boolean
}

const NavigationContext = createContext<NavigationContextType>({
  activeView: 'today',
  previousView: null,
  setActiveView: () => {},
  goBack: () => {},
  isTransitioning: false,
})

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [previousView, setPreviousView] = useState<ViewId | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Use cloud-synced UI state
  const { activeView, setActiveView: setUIActiveView, isHydrated } = useUIStateContext()

  const setActiveView = useCallback((view: ViewId) => {
    if (view === activeView) return

    setIsTransitioning(true)
    setPreviousView(activeView)
    setUIActiveView(view)

    // Slight delay to allow for transition animation
    setTimeout(() => {
      setIsTransitioning(false)
    }, 150)
  }, [activeView, setUIActiveView])

  const goBack = useCallback(() => {
    if (previousView) {
      setActiveView(previousView)
    }
  }, [previousView, setActiveView])

  // Each time the app loads, open on the start view from settings (Today
  // unless changed), rather than wherever the last session ended.
  const { settings, loading: settingsLoading } = useSettings()
  const openedStartView = useRef(false)
  useEffect(() => {
    if (openedStartView.current || !isHydrated || settingsLoading) return
    openedStartView.current = true
    if (settings.startView !== activeView) setUIActiveView(settings.startView)
  }, [isHydrated, settingsLoading, settings.startView, activeView, setUIActiveView])

  // Handle legacy view IDs
  useEffect(() => {
    if (isHydrated && ((activeView as string) === 'calendar' || (activeView as string) === 'dashboard')) {
      setUIActiveView('today')
    }
  }, [isHydrated, activeView, setUIActiveView])

  return (
    <NavigationContext.Provider
      value={{
        activeView,
        previousView,
        setActiveView,
        goBack,
        isTransitioning,
      }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
