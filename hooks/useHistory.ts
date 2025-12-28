'use client'

import { useCallback, useRef, useState } from 'react'

export interface HistoryAction {
  type: string
  description: string
  undo: () => void
  redo: () => void
}

interface UseHistoryReturn {
  canUndo: boolean
  canRedo: boolean
  undo: () => HistoryAction | null
  redo: () => HistoryAction | null
  pushAction: (action: HistoryAction) => void
  clear: () => void
}

const MAX_HISTORY = 50

export function useHistory(): UseHistoryReturn {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([])
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([])

  const pushAction = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action]
      // Limit history size
      if (newStack.length > MAX_HISTORY) {
        return newStack.slice(-MAX_HISTORY)
      }
      return newStack
    })
    // Clear redo stack when new action is performed
    setRedoStack([])
  }, [])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return null

    const action = undoStack[undoStack.length - 1]
    action.undo()

    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, action])

    return action
  }, [undoStack])

  const redo = useCallback(() => {
    if (redoStack.length === 0) return null

    const action = redoStack[redoStack.length - 1]
    action.redo()

    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, action])

    return action
  }, [redoStack])

  const clear = useCallback(() => {
    setUndoStack([])
    setRedoStack([])
  }, [])

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
    pushAction,
    clear,
  }
}
