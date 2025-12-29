'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Board } from '@/lib/types'

interface DbBoard {
  id: string
  user_id: string
  name: string
  created_at: string
}

interface DbSettings {
  active_board_id: string | null
}

export function useSupabaseBoards() {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch boards on mount
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchBoards = async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: true })

      if (!error && data) {
        const mappedBoards: Board[] = (data as DbBoard[]).map(b => ({
          id: b.id,
          name: b.name,
          createdAt: new Date(b.created_at).getTime(),
        }))
        setBoards(mappedBoards)

        // If no boards, create a default one
        if (mappedBoards.length === 0) {
          const newBoardId = await addBoard('My Board')
          setActiveBoardId(newBoardId)
        } else {
          // Fetch user settings for active board
          const { data: settingsData } = await supabase
            .from('user_settings')
            .select('active_board_id')
            .single()

          const settings = settingsData as DbSettings | null
          if (settings?.active_board_id) {
            setActiveBoardId(settings.active_board_id)
          } else {
            setActiveBoardId(mappedBoards[0].id)
          }
        }
      }
      setLoading(false)
    }

    fetchBoards()
  }, [user])

  const addBoard = useCallback(async (name: string): Promise<string> => {
    if (!user) return ''

    const { data, error } = await supabase
      .from('boards')
      .insert({ user_id: user.id, name })
      .select()
      .single()

    if (!error && data) {
      const newBoard: Board = {
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at).getTime(),
      }
      setBoards(prev => [...prev, newBoard])
      setActiveBoardId(data.id)

      // Update user settings
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, active_board_id: data.id })

      return data.id
    }
    return ''
  }, [user, supabase])

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    const { error } = await supabase
      .from('boards')
      .update({ name: updates.name })
      .eq('id', id)

    if (!error) {
      setBoards(prev => prev.map(board =>
        board.id === id ? { ...board, ...updates } : board
      ))
    }
  }, [supabase])

  const deleteBoard = useCallback(async (id: string) => {
    if (boards.length <= 1) return

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', id)

    if (!error) {
      setBoards(prev => prev.filter(board => board.id !== id))

      if (activeBoardId === id) {
        const remaining = boards.filter(b => b.id !== id)
        if (remaining.length > 0) {
          switchBoard(remaining[0].id)
        }
      }
    }
  }, [boards, activeBoardId, supabase])

  const switchBoard = useCallback(async (id: string) => {
    if (!user) return

    setActiveBoardId(id)

    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, active_board_id: id })
  }, [user, supabase])

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0]

  return {
    boards,
    activeBoard,
    activeBoardId,
    addBoard,
    updateBoard,
    deleteBoard,
    switchBoard,
    loading,
  }
}
