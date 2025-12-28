'use client'

import { useState } from 'react'
import { PanelRightClose, PanelRight } from 'lucide-react'
import { TodoList } from './TodoList'
import { Notes } from './Notes'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 top-8 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-10"
          title="Open sidebar"
        >
          <PanelRight size={20} />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] flex flex-col transition-all duration-300 ease-out',
          isOpen ? 'w-[340px] animate-slide-in' : 'w-0 overflow-hidden'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">
              Workspace
            </p>
            <span className="font-display text-lg text-[var(--text-primary)] italic">Tools</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Close sidebar"
          >
            <PanelRightClose size={18} />
          </button>
        </div>

        {/* Sections Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Todo List Section */}
          <div className="p-6 border-b border-[var(--border-subtle)] h-[50%] overflow-hidden">
            <TodoList />
          </div>

          {/* Notes Section */}
          <div className="p-6 flex-1 overflow-hidden">
            <Notes />
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
            Data saved locally
          </p>
        </div>
      </aside>
    </>
  )
}
