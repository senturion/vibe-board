'use client'

import { X, Keyboard } from 'lucide-react'
import { KEYBOARD_SHORTCUTS } from '@/lib/types'

interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl shadow-black/50 z-50 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <Keyboard size={18} className="text-[var(--text-tertiary)]" />
            <span className="font-display text-lg text-[var(--text-primary)] italic">Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-3">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text-secondary)]">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-4 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] text-[var(--text-tertiary)] text-center uppercase tracking-[0.1em]">
            Press any key to dismiss
          </p>
        </div>
      </div>
    </>
  )
}
