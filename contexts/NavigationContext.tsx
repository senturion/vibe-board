'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { ViewId } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'

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
  const [activeView, setActiveViewState] = useState<ViewId>('dashboard')
  const [previousView, setPreviousView] = useState<ViewId | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  // Load default view from user settings
  useEffect(() => {
    if (!user) return

    const loadDefaultView = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('default_view')
        .eq('user_id', user.id)
        .single()

      if (data?.default_view) {
        setActiveViewState(data.default_view as ViewId)
      }
      setIsHydrated(true)
    }

    loadDefaultView()
  }, [user, supabase])

  // Also check localStorage for immediate view (for faster UX)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isHydrated) {
      const savedView = localStorage.getItem('vibe-active-view')
      if (savedView) {
        setActiveViewState(savedView as ViewId)
      }
      setIsHydrated(true)
    }
  }, [isHydrated])

  const setActiveView = useCallback((view: ViewId) => {
    if (view === activeView) return

    setIsTransitioning(true)
    setPreviousView(activeView)
    setActiveViewState(view)

    // Save to localStorage for immediate access on next load
    if (typeof window !== 'undefined') {
      localStorage.setItem('vibe-active-view', view)
    }

    // Slight delay to allow for transition animation
    setTimeout(() => {
      setIsTransitioning(false)
    }, 150)
  }, [activeView])

  const goBack = useCallback(() => {
    if (previousView) {
      setActiveView(previousView)
    }
  }, [previousView, setActiveView])

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
