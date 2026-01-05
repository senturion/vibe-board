'use client'

import { ReactNode } from 'react'
import { UndoRedoProvider } from '@/contexts/UndoRedoContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { UIStateProvider } from '@/contexts/UIStateContext'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { HabitsProvider } from '@/contexts/HabitsContext'
import { WorkLocationProvider } from '@/contexts/WorkLocationContext'
import { TagsProvider } from '@/contexts/TagsContext'

export function Providers({ children }: { children: ReactNode }) {
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
