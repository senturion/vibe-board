'use client'

import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Board, KanbanTask } from '@/lib/types'
import { Database } from '@/lib/supabase/types'
import { notifyError } from '@/lib/notify'
import { tasksQueryKey } from '@/hooks/useKanban'

type BoardRow = Database['public']['Tables']['boards']['Row']

interface BoardsState {
  boards: Board[]
  activeBoardId: string | null
}

export const boardsQueryKey = (userId: string | undefined) => ['boards', userId ?? 'signed-out'] as const

const EMPTY: BoardsState = { boards: [], activeBoardId: null }

function mapBoard(b: BoardRow): Board {
  return {
    id: b.id,
    name: b.name,
    createdAt: new Date(b.created_at).getTime(),
    staleDaysThreshold: b.stale_days_threshold ?? undefined,
  }
}

/**
 * Boards and the active board, shared by every component that reads them, so
 * switching board in one place is seen everywhere.
 */
export function useBoards() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const userId = user?.id
  const queryKey = useMemo(() => boardsQueryKey(userId), [userId])

  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<BoardsState> => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw new Error(error.message)

      let boards = ((data ?? []) as BoardRow[]).map(mapBoard)

      // Create a default board the first time the app is used.
      if (boards.length === 0) {
        const { data: created, error: createError } = await supabase
          .from('boards')
          .insert({ user_id: user!.id, name: 'My Board' })
          .select()
          .single()
        if (createError) throw new Error(createError.message)
        boards = [mapBoard(created as BoardRow)]
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('active_board_id')
        .maybeSingle()

      const saved = settings?.active_board_id
      // Keep a board the user switched to while this load was in flight.
      const current = queryClient.getQueryData<BoardsState>(queryKey)?.activeBoardId
      const activeBoardId =
        [current, saved].find(id => id && boards.some(b => b.id === id)) ?? boards[0].id

      return { boards, activeBoardId }
    },
  })

  const { boards, activeBoardId } = query.data ?? EMPTY
  const loading = !!user && query.isPending
  const error = query.error ? 'Failed to load boards. Please try refreshing.' : null

  const setState = useCallback((updater: (state: BoardsState) => BoardsState) => {
    queryClient.setQueryData<BoardsState>(queryKey, prev => updater(prev ?? EMPTY))
  }, [queryClient, queryKey])

  const saveActiveBoard = useCallback(async (id: string) => {
    if (!user) return
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, active_board_id: id })
    if (error) console.error('Error saving active board:', error)
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
      notifyError('Could not create the board.')
      return ''
    }

    const newBoard = mapBoard(data as BoardRow)
    setState(state => ({ boards: [...state.boards, newBoard], activeBoardId: newBoard.id }))
    await saveActiveBoard(newBoard.id)
    return newBoard.id
  }, [user, supabase, setState, saveActiveBoard])

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    const dbUpdates: Database['public']['Tables']['boards']['Update'] = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.staleDaysThreshold !== undefined) dbUpdates.stale_days_threshold = updates.staleDaysThreshold

    const before = queryClient.getQueryData<BoardsState>(queryKey)?.boards.find(b => b.id === id)
    setState(state => ({
      ...state,
      boards: state.boards.map(board => (board.id === id ? { ...board, ...updates } : board)),
    }))

    const { error } = await supabase.from('boards').update(dbUpdates).eq('id', id)
    if (error) {
      console.error('Error updating board:', error)
      if (before) {
        setState(state => ({
          ...state,
          boards: state.boards.map(board => (board.id === id ? before : board)),
        }))
      }
      notifyError('Could not save the board.')
    }
  }, [supabase, queryClient, queryKey, setState])

  const deleteBoard = useCallback(async (id: string) => {
    const state = queryClient.getQueryData<BoardsState>(queryKey) ?? EMPTY
    if (state.boards.length <= 1) return

    const { error } = await supabase.from('boards').delete().eq('id', id)
    if (error) {
      console.error('Error deleting board:', error)
      notifyError('Could not delete the board.')
      return
    }

    const remaining = state.boards.filter(board => board.id !== id)
    const nextActive = state.activeBoardId === id ? remaining[0].id : state.activeBoardId
    setState(() => ({ boards: remaining, activeBoardId: nextActive }))

    // The database deletes the board's tasks with it; drop them from the cache too.
    queryClient.setQueryData<KanbanTask[]>(tasksQueryKey(userId), prev =>
      prev?.filter(task => task.boardId !== id),
    )

    if (state.activeBoardId === id) await saveActiveBoard(remaining[0].id)
  }, [supabase, queryClient, queryKey, userId, setState, saveActiveBoard])

  const switchBoard = useCallback(async (id: string) => {
    setState(state => ({ ...state, activeBoardId: id }))
    await saveActiveBoard(id)
  }, [setState, saveActiveBoard])

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0] || { id: '', name: 'Loading...', createdAt: 0 }

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
