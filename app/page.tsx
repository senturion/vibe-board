'use client'

import { Board } from '@/components/kanban/Board'
import { Sidebar } from '@/components/sidebar/Sidebar'

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Main Kanban Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Editorial Header */}
        <header className="relative px-8 pt-8 pb-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-end justify-between gap-8">
            <div className="animate-fade-up">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-2">
                Project Management
              </p>
              <h1 className="font-display text-4xl text-[var(--text-primary)] tracking-tight leading-none">
                Vibe Board
              </h1>
            </div>
            <div className="animate-fade-up flex items-center gap-6 pb-1" style={{ animationDelay: '0.1s', opacity: 0 }}>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Today</p>
                <p className="text-sm text-[var(--text-secondary)] font-light">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="w-px h-8 bg-[var(--border)]" />
              <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" title="Synced locally" />
            </div>
          </div>

          {/* Decorative line */}
          <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-[var(--accent)] via-[var(--border)] to-transparent" />
        </header>

        {/* Board Area */}
        <div className="flex-1 overflow-auto">
          <Board />
        </div>
      </main>

      {/* Sidebar */}
      <Sidebar />
    </div>
  )
}
