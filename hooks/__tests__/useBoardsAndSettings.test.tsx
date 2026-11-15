import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

type Row = Record<string, unknown>

const db = {
  boards: [] as Row[],
  user_settings: [] as Row[],
  selects: {} as Record<string, number>,
}

function builder(table: 'boards' | 'user_settings') {
  let mode: 'select' | 'update' | 'delete' | 'insert' | 'upsert' = 'select'
  let patch: Row = {}
  const filters: Row = {}
  const matches = (row: Row) => Object.entries(filters).every(([k, v]) => row[k] === v)

  const run = () => {
    if (mode === 'select') {
      db.selects[table] = (db.selects[table] ?? 0) + 1
      return { data: db[table].filter(matches), error: null }
    }
    if (mode === 'insert') {
      const row = { id: `board-${db.boards.length + 1}`, created_at: '2026-11-01T00:00:00Z', stale_days_threshold: null, ...patch }
      db[table].push(row)
      return { data: row, error: null }
    }
    if (mode === 'upsert') {
      const existing = db[table].find(r => r.user_id === patch.user_id)
      if (existing) Object.assign(existing, patch)
      else db[table].push({ ...patch })
      return { data: null, error: null }
    }
    if (mode === 'update') db[table] = db[table].map(r => (matches(r) ? { ...r, ...patch } : r))
    if (mode === 'delete') db[table] = db[table].filter(r => !matches(r))
    return { data: null, error: null }
  }

  const first = () => {
    const result = run()
    return { data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: null }
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    order: () => chain,
    update: (p: Row) => ((mode = 'update'), (patch = p), chain),
    delete: () => ((mode = 'delete'), chain),
    insert: (p: Row) => ((mode = 'insert'), (patch = p), chain),
    upsert: (p: Row) => ((mode = 'upsert'), (patch = p), chain),
    eq: (k: string, v: unknown) => ((filters[k] = v), chain),
    single: async () => first(),
    maybeSingle: async () => first(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(run()).then(resolve),
  }
  return chain
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: (table: 'boards' | 'user_settings') => builder(table) }),
}))
const user = { id: 'user-1' }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }))
vi.mock('@/lib/haptics', () => ({ haptics: { success: vi.fn() } }))

import { useBoards } from '../useBoards'
import { useSettings } from '../useSettings'

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const board = (id: string, name: string): Row => ({
  id,
  user_id: 'user-1',
  name,
  created_at: '2026-11-01T00:00:00Z',
  stale_days_threshold: null,
})

beforeEach(() => {
  localStorage.clear()
  db.boards = [board('a', 'Work'), board('b', 'Home')]
  db.user_settings = [{ user_id: 'user-1', active_board_id: 'b', app_settings: { compactCards: true } }]
  db.selects = {}
})

describe('useBoards', () => {
  it('shares the active board between callers', async () => {
    const { result } = renderHook(() => ({ page: useBoards(), widget: useBoards() }), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.page.boards).toHaveLength(2))
    expect(result.current.widget.activeBoardId).toBe('b')
    expect(db.selects.boards).toBe(1)

    await act(async () => {
      await result.current.page.switchBoard('a')
    })
    await waitFor(() => expect(result.current.widget.activeBoardId).toBe('a'))
    expect(db.user_settings[0].active_board_id).toBe('a')
  })

  it('creates a default board on first use', async () => {
    db.boards = []
    db.user_settings = []
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.boards).toHaveLength(1))
    expect(result.current.activeBoard.name).toBe('My Board')
    expect(db.boards).toHaveLength(1)
  })

  it('never deletes the last board, and moves off a deleted active board', async () => {
    const { result } = renderHook(() => useBoards(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.boards).toHaveLength(2))

    await act(async () => {
      await result.current.deleteBoard('b')
    })
    await waitFor(() => expect(result.current.boards.map(b => b.id)).toEqual(['a']))
    expect(result.current.activeBoardId).toBe('a')

    await act(async () => {
      await result.current.deleteBoard('a')
    })
    expect(db.boards).toHaveLength(1)
  })
})

describe('useSettings', () => {
  it('fetches once however many components read it, and shares updates', async () => {
    const { result } = renderHook(
      () => Array.from({ length: 20 }, () => useSettings()),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current[0].settings.compactCards).toBe(true))
    expect(db.selects.user_settings).toBe(1)

    act(() => result.current[3].updateSetting('archiveAfterDays', 30))
    await waitFor(() => expect(result.current[17].settings.archiveAfterDays).toBe(30))
    expect((db.user_settings[0].app_settings as Row).archiveAfterDays).toBe(30)
  })

  it('never sends the API key to the cloud', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.updateSetting('aiApiKey', 'sk-secret'))
    await waitFor(() => expect(result.current.settings.aiApiKey).toBe('sk-secret'))
    expect(JSON.stringify(db.user_settings)).not.toContain('sk-secret')
    expect(localStorage.getItem('vibe-app-settings')).toContain('sk-secret')
  })
})
