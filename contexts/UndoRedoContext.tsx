'use client'

import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react'
import { ToastContainer, ToastData } from '@/components/Toast'
import { generateId } from '@/lib/utils'

interface HistoryAction {
  type: string
  description: string
  undo: () => void
  redo: () => void
}

interface UndoRedoContextType {
  canUndo: boolean
  canRedo: boolean
  pushAction: (action: HistoryAction) => void
  showInfoToast: (message: string) => void
}

const UndoRedoContext = createContext<UndoRedoContextType | null>(null)

const MAX_HISTORY = 50

export function UndoRedoProvider({ children }: { children: ReactNode }) {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([])
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([])
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = useCallback((type: 'undo' | 'redo', message: string) => {
    const toast: ToastData = {
      id: generateId(),
      type,
      message,
    }
    setToasts(prev => [...prev.slice(-2), toast]) // Keep max 3 toasts
  }, [])

  const showInfoToast = useCallback((message: string) => {
    const toast: ToastData = {
      id: generateId(),
      type: 'info',
      message,
    }
    setToasts(prev => [...prev.slice(-2), toast])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const pushAction = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action]
      if (newStack.length > MAX_HISTORY) {
        return newStack.slice(-MAX_HISTORY)
      }
      return newStack
    })
    setRedoStack([])
  }, [])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return

    const action = undoStack[undoStack.length - 1]
    action.undo()

    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, action])

    showToast('undo', action.description)
  }, [undoStack, showToast])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return

    const action = redoStack[redoStack.length - 1]
    action.redo()

    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, action])

    showToast('redo', action.description)
  }, [redoStack, showToast])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Cmd/Ctrl + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Cmd/Ctrl + Shift + Z for redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      }

      // Cmd/Ctrl + Y for redo (Windows style)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return (
    <UndoRedoContext.Provider
      value={{
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        pushAction,
        showInfoToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </UndoRedoContext.Provider>
  )
}

export function useUndoRedo() {
  const context = useContext(UndoRedoContext)
  if (!context) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider')
  }
  return context
}
