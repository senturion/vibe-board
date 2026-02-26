'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Board } from '@/lib/types'
import { Database } from '@/lib/supabase/types'

type BoardRow = Database['public']['Tables']['boards']['Row']
type UserSettingsRow = Database['public']['Tables']['user_settings']['Row']

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch boards from Supabase
  useEffect(() => {
    let isActive = true
    const fetchBoards = async () => {
      if (!user) {
        if (isActive) {
          setBoards([])
          setActiveBoardIdState(null)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching boards:', error)
        if (isActive) {
          setError('Failed to load boards. Please try refreshing.')
          setLoading(false)
        }
        return
      }

      if (isActive) setError(null)

      const mappedBoards: Board[] = (data as BoardRow[]).map(b => ({
        id: b.id,
        name: b.name,
        createdAt: new Date(b.created_at).getTime(),
        staleDaysThreshold: b.stale_days_threshold ?? undefined,
      }))

      if (isActive) {
        setBoards(mappedBoards)
      }

      // Fetch user settings to get active board
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('active_board_id')
        .single()

      const settings = settingsData as UserSettingsRow | null
      if (settings?.active_board_id && mappedBoards.some(b => b.id === settings.active_board_id)) {
        if (isActive) {
          setActiveBoardIdState(settings.active_board_id)
        }
      } else if (mappedBoards.length > 0) {
        if (isActive) {
          setActiveBoardIdState(mappedBoards[0].id)
        }
      }

      // Create default board if none exist
      if (mappedBoards.length === 0) {
        const { data: newBoardData, error: createError } = await supabase
          .from('boards')
          .insert({ user_id: user.id, name: 'My Board' })
          .select()
          .single()

        if (createError) {
          console.error('Error creating default board:', createError.message, createError.code)
        }
        const newBoard = newBoardData as BoardRow | null
        if (!createError && newBoard) {
          const board: Board = {
            id: newBoard.id,
            name: newBoard.name,
            createdAt: new Date(newBoard.created_at).getTime(),
          }
          if (isActive) {
            setBoards([board])
            setActiveBoardIdState(newBoard.id)
          }
        }
      }

      if (isActive) {
        setLoading(false)
      }
    }

    fetchBoards()
    return () => {
      isActive = false
    }
  }, [user, supabase])

  const addBoard = useCallback(async (name: string) => {
    if (!user) return ''

    const { data, error } = await supabase
      .from('boards')
      .insert({ user_id: user.id, name })
      .select()
      .single()

    if (error || !data) {
      console.error('Error creating board:', error)
      return ''
    }

    const boardData = data as BoardRow
    const newBoard: Board = {
      id: boardData.id,
      name: boardData.name,
      createdAt: new Date(boardData.created_at).getTime(),
    }

    setBoards(prev => [...prev, newBoard])
    setActiveBoardIdState(newBoard.id)

    // Update active board in settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, active_board_id: newBoard.id })
    if (settingsError) {
      console.error('Error updating active board setting:', settingsError)
    }

    return newBoard.id
  }, [user, supabase])

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.staleDaysThreshold !== undefined) dbUpdates.stale_days_threshold = updates.staleDaysThreshold

    const { error } = await supabase
      .from('boards')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('Error updating board:', error)
      return
    }

    setBoards(prev => prev.map(board =>
      board.id === id ? { ...board, ...updates } : board
    ))
  }, [supabase])

  const deleteBoard = useCallback(async (id: string) => {
    if (boards.length <= 1) return

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting board:', error)
      return
    }

    setBoards(prev => prev.filter(board => board.id !== id))

    if (activeBoardId === id) {
      const remaining = boards.filter(b => b.id !== id)
      if (remaining.length > 0) {
        setActiveBoardIdState(remaining[0].id)
        if (user) {
          await supabase
            .from('user_settings')
            .upsert({ user_id: user.id, active_board_id: remaining[0].id })
        }
      }
    }
  }, [boards, activeBoardId, user, supabase])

  const switchBoard = useCallback(async (id: string) => {
    setActiveBoardIdState(id)
    if (user) {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, active_board_id: id })
      if (error) {
        console.error('Error switching board:', error)
      }
    }
  }, [user, supabase])

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0] || { id: '', name: 'Loading...', createdAt: new Date().getTime() }

  return {
    boards,
    activeBoard,
    activeBoardId: activeBoardId || '',
    addBoard,
    updateBoard,
    deleteBoard,
    switchBoard,
    loading,
    error,
  }
}
