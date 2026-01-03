'use client'

import { ReactNode } from 'react'
import { UndoRedoProvider } from '@/contexts/UndoRedoContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { HabitsProvider } from '@/contexts/HabitsContext'
import { WorkLocationProvider } from '@/contexts/WorkLocationContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>
        <WorkLocationProvider>
          <HabitsProvider>
            <UndoRedoProvider>
              {children}
            </UndoRedoProvider>
          </HabitsProvider>
        </WorkLocationProvider>
      </NavigationProvider>
    </AuthProvider>
  )
}
