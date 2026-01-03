'use client'

import { useState } from 'react'
import { PanelRightClose, PanelRight, ChevronDown, ChevronUp } from 'lucide-react'
import { TodoList } from './TodoList'
import { Notes } from './Notes'
import { QuoteWidget, WeatherWidget, HabitsMiniWidget, FocusMiniWidget, GoalsMiniWidget, WorkLocationWidget } from './widgets'
import { cn } from '@/lib/utils'

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--border-subtle)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] font-medium">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp size={12} className="text-[var(--text-tertiary)]" />
        ) : (
          <ChevronDown size={12} className="text-[var(--text-tertiary)]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-8 top-3 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-20"
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <PanelRightClose size={20} /> : <PanelRight size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] flex flex-col transition-all duration-300 ease-out',
          isOpen ? 'w-[320px] animate-slide-in' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div>
            <span className="font-display text-xl tracking-tight text-[var(--text-primary)]">Widgets</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Weather & Quote - Always visible at top */}
          <div className="p-4 space-y-3 border-b border-[var(--border-subtle)]">
            <WeatherWidget />
            <QuoteWidget />
          </div>

          {/* Work Location */}
          <CollapsibleSection title="Work Location" defaultOpen={true}>
            <WorkLocationWidget />
          </CollapsibleSection>

          {/* Focus Timer */}
          <CollapsibleSection title="Focus Timer" defaultOpen={true}>
            <FocusMiniWidget />
          </CollapsibleSection>

          {/* Habits */}
          <CollapsibleSection title="Today's Habits" defaultOpen={true}>
            <HabitsMiniWidget />
          </CollapsibleSection>

          {/* Goals */}
          <CollapsibleSection title="Goals" defaultOpen={true}>
            <GoalsMiniWidget />
          </CollapsibleSection>

          {/* Quick Tasks */}
          <CollapsibleSection title="Quick Tasks" defaultOpen={true}>
            <div className="max-h-[200px] overflow-y-auto">
              <TodoList compact />
            </div>
          </CollapsibleSection>

          {/* Notes */}
          <CollapsibleSection title="Quick Notes" defaultOpen={false}>
            <div className="max-h-[250px] overflow-y-auto">
              <Notes compact />
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)]">
          <p className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
            Synced with Supabase
          </p>
        </div>
      </aside>
    </>
  )
}
