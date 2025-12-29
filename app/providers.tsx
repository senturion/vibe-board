'use client'

import { ReactNode } from 'react'
import { UndoRedoProvider } from '@/contexts/UndoRedoContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UndoRedoProvider>
      {children}
    </UndoRedoProvider>
  )
}
