'use client'

import { ReactNode } from 'react'
import { UndoRedoProvider } from '@/contexts/UndoRedoContext'
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UndoRedoProvider>
        {children}
      </UndoRedoProvider>
    </AuthProvider>
  )
}
