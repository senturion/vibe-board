'use client'

import { X, Check, ArrowRight, Undo2 } from 'lucide-react'

interface StopFocusPromptProps {
  isOpen: boolean
  onConfirm: (action: 'complete' | 'in-progress' | 'todo') => void
  onCancel: () => void
}

export function StopFocusPrompt({ isOpen, onConfirm, onCancel }: StopFocusPromptProps) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onCancel}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl shadow-black/50 z-50 animate-fade-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <p className="text-[12px] uppercase tracking-[0.15em] text-[var(--text-secondary)] font-medium">
            Stop Focusing
          </p>
          <button
            onClick={onCancel}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <button
            onClick={() => onConfirm('complete')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] uppercase tracking-[0.1em] text-[var(--success)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--success)] transition-colors"
          >
            <Check size={16} />
            Mark Complete
          </button>
          <button
            onClick={() => onConfirm('in-progress')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <ArrowRight size={16} />
            Keep in Progress
          </button>
          <button
            onClick={() => onConfirm('todo')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-[12px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <Undo2 size={16} />
            Back to Todo
          </button>
        </div>
      </div>
    </>
  )
}
