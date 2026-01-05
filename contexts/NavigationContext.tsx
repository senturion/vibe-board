'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { ViewId } from '@/lib/types'
import { useUIStateContext } from './UIStateContext'

interface NavigationContextType {
  activeView: ViewId
  previousView: ViewId | null
  setActiveView: (view: ViewId) => void
  goBack: () => void
  isTransitioning: boolean
}

const NavigationContext = createContext<NavigationContextType>({
  activeView: 'dashboard',
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

  // Handle legacy calendar view - redirect to dashboard
  useEffect(() => {
    if (isHydrated && (activeView as string) === 'calendar') {
      setUIActiveView('dashboard')
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
