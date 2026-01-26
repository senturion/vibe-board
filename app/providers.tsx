'use client'

import { ReactNode, useEffect } from 'react'
import { UndoRedoProvider } from '@/contexts/UndoRedoContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { UIStateProvider } from '@/contexts/UIStateContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { HabitsProvider } from '@/contexts/HabitsContext'
import { WorkLocationProvider } from '@/contexts/WorkLocationContext'
import { TagsProvider } from '@/contexts/TagsContext'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (typeof window === 'undefined') return
    const shouldReset = new URLSearchParams(window.location.search).has('reset-sw')
    if (!shouldReset) return
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
        })
      })
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          caches.delete(key)
        })
      })
    }
  }, [])

  return (
    <AuthProvider>
      <UIStateProvider>
        <NavigationProvider>
          <WorkLocationProvider>
            <TagsProvider>
              <HabitsProvider>
                <UndoRedoProvider>
                  {children}
                </UndoRedoProvider>
              </HabitsProvider>
            </TagsProvider>
          </WorkLocationProvider>
        </NavigationProvider>
      </UIStateProvider>
    </AuthProvider>
  )
}
