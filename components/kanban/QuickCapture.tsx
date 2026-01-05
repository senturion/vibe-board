'use client'

import { useState, useEffect, useRef } from 'react'
import { Command, Flag } from 'lucide-react'
import { Priority, PRIORITIES } from '@/lib/types'
import { cn } from '@/lib/utils'

interface QuickCaptureProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (title: string, priority: Priority) => void
}

export function QuickCapture({ isOpen, onClose, onAdd }: QuickCaptureProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const syncTimeout = setTimeout(() => {
        setTitle('')
        setPriority('medium')
        setTimeout(() => inputRef.current?.focus(), 50)
      }, 0)

      return () => {
        clearTimeout(syncTimeout)
        document.body.style.overflow = ''
      }
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim(), priority)
      setTitle('')
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Cycle through priorities
      const currentIdx = PRIORITIES.findIndex(p => p.id === priority)
      const nextIdx = (currentIdx + 1) % PRIORITIES.length
      setPriority(PRIORITIES[nextIdx].id)
    }
  }

  if (!isOpen) return null

  const selectedPriority = PRIORITIES.find(p => p.id === priority)!

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal - centered, spotlight style */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl z-50 animate-fade-up">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl shadow-black/50">
          {/* Input area */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-tertiary)] text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                <Command size={12} />
                K
              </div>
              <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                Quick Capture
              </span>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className="w-full bg-transparent font-display text-2xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
              autoComplete="off"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
            {/* Priority selector */}
            <div className="flex items-center gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-all',
                    priority === p.id
                      ? 'bg-[var(--bg-secondary)] border border-[var(--border)]'
                      : 'opacity-50 hover:opacity-100'
                  )}
                  style={{ color: p.color }}
                >
                  <Flag size={10} fill={p.id === 'urgent' || p.id === 'high' ? p.color : 'none'} />
                  {p.label}
                </button>
              ))}
            </div>

            {/* Hints */}
            <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
              <span>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border)] mr-1">Tab</kbd>
                priority
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border)] mr-1">Enter</kbd>
                add
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
