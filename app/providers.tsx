'use client'

import { ReactNode } from 'react'
import { UndoRedoProvider } from '@/contexts/UndoRedoContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavigationProvider } from '@/contexts/NavigationContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>
        <UndoRedoProvider>
          {children}
        </UndoRedoProvider>
      </NavigationProvider>
    </AuthProvider>
  )
}
