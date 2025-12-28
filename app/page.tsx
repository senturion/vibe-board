'use client'

import { useState } from 'react'
import { Board } from '@/components/kanban/Board'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Header } from '@/components/Header'
import { useBoards } from '@/hooks/useBoards'

export default function Home() {
  const {
    boards,
    activeBoard,
    activeBoardId,
    addBoard,
    updateBoard,
    deleteBoard,
    switchBoard,
  } = useBoards()

  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Main Kanban Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Board Selector */}
        <Header
          boards={boards}
          activeBoard={activeBoard}
          onSwitchBoard={switchBoard}
          onAddBoard={addBoard}
          onDeleteBoard={deleteBoard}
          onUpdateBoard={updateBoard}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Editorial Subheader */}
        <div className="relative px-8 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-end justify-between gap-8">
            <div className="animate-fade-up">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-1">
                Current Board
              </p>
              <h2 className="font-display text-2xl text-[var(--text-primary)] tracking-tight leading-none italic">
                {activeBoard.name}
              </h2>
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
        </div>

        {/* Board Area */}
        <div className="flex-1 overflow-auto">
          <Board
            boardId={activeBoardId}
            searchOpen={searchOpen}
            onSearchClose={() => setSearchOpen(false)}
          />
        </div>
      </main>

      {/* Sidebar */}
      <Sidebar />
    </div>
  )
}
