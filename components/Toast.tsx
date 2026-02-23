'use client'

import { useEffect, useState } from 'react'
import { Undo2, Redo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToastData {
  id: string
  type: 'undo' | 'redo' | 'info'
  message: string
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const duration = toast.type === 'info' ? 8000 : 3000

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onDismiss(toast.id), 200)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, onDismiss, duration])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 200)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/20 min-w-[280px] max-w-[400px]',
        'transition-all duration-200',
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 animate-slide-up'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'p-1.5 shrink-0',
          toast.type === 'undo' && 'bg-[var(--accent-glow)] text-[var(--accent)]',
          toast.type === 'redo' && 'bg-[var(--success)]/10 text-[var(--success)]',
          toast.type === 'info' && 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
        )}
      >
        {toast.type === 'undo' && <Undo2 size={14} />}
        {toast.type === 'redo' && <Redo2 size={14} />}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[var(--text-primary)] truncate">
          {toast.message}
        </p>
        <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-0.5">
          {toast.type === 'undo' ? 'Action undone' : toast.type === 'redo' ? 'Action restored' : ''}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] animate-shrink"
          style={{ animationDuration: `${duration / 1000}s` }}
        />
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  const infoToasts = toasts.filter(t => t.type === 'info')
  const actionToasts = toasts.filter(t => t.type !== 'info')

  return (
    <>
      {infoToasts.length > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
          {infoToasts.map(toast => (
            <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </div>
      )}
      {actionToasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
          {actionToasts.map(toast => (
            <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
          ))}
        </div>
      )}
    </>
  )
}
