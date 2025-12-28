'use client'

import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { Board } from '@/lib/types'
import { generateId } from '@/lib/utils'

const DEFAULT_BOARD: Board = {
  id: 'default',
  name: 'My Board',
  createdAt: Date.now(),
}

export function useBoards() {
  const [boards, setBoards] = useLocalStorage<Board[]>('kanban-boards', [DEFAULT_BOARD])
  const [activeBoardId, setActiveBoardId] = useLocalStorage<string>('kanban-active-board', 'default')

  const addBoard = useCallback((name: string) => {
    const newBoard: Board = {
      id: generateId(),
      name,
      createdAt: Date.now(),
    }
    setBoards(prev => [...prev, newBoard])
    setActiveBoardId(newBoard.id)
    return newBoard.id
  }, [setBoards, setActiveBoardId])

  const updateBoard = useCallback((id: string, updates: Partial<Board>) => {
    setBoards(prev => prev.map(board =>
      board.id === id ? { ...board, ...updates } : board
    ))
  }, [setBoards])

  const deleteBoard = useCallback((id: string) => {
    // Don't allow deleting the last board
    if (boards.length <= 1) return

    setBoards(prev => prev.filter(board => board.id !== id))

    // If deleting the active board, switch to another
    if (activeBoardId === id) {
      const remaining = boards.filter(b => b.id !== id)
      if (remaining.length > 0) {
        setActiveBoardId(remaining[0].id)
      }
    }
  }, [boards, activeBoardId, setBoards, setActiveBoardId])

  const switchBoard = useCallback((id: string) => {
    setActiveBoardId(id)
  }, [setActiveBoardId])

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0] || DEFAULT_BOARD

  return {
    boards,
    activeBoard,
    activeBoardId,
    addBoard,
    updateBoard,
    deleteBoard,
    switchBoard,
  }
}
