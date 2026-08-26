'use client'

import { ReactNode, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UndoRedoProvider } from '@/contexts/UndoRedoContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { UIStateProvider } from '@/contexts/UIStateContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { HabitsProvider } from '@/contexts/HabitsContext'
import { WorkLocationProvider } from '@/contexts/WorkLocationContext'
import { TagsProvider } from '@/contexts/TagsContext'

/**
 * AuthProvider builds the Supabase client at the root of the app, so a
 * missing/invalid NEXT_PUBLIC_SUPABASE_* env var would otherwise crash
 * every page. Catch that here with a message that says what's actually
 * wrong instead of the generic error boundary.
 */
function ConfigErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="max-w-sm w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="font-display text-2xl text-white mb-2">Vibe Board isn&apos;t configured</h1>
        <p className="text-[#888] text-sm mb-6">
          The app is missing required Supabase configuration and can&apos;t start. If you&apos;re the
          site administrator, check that <code className="text-[#aaa]">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
          and <code className="text-[#aaa]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set for this
          deployment.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-[#eee] transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

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
    <ErrorBoundary section="Vibe Board" fallback={<ConfigErrorFallback />}>
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
    </ErrorBoundary>
  )
}
