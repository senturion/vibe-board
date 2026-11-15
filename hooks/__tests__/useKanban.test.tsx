import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

type Row = Record<string, unknown>

// A small in-memory stand-in for the Supabase tasks table.
const db = {
  rows: [] as Row[],
  selects: 0,
  failWrites: false,
  updates: [] as Array<{ patch: Row; filters: Row }>,
}

function builder() {
  let mode: 'select' | 'update' | 'delete' | 'insert' = 'select'
  let patch: Row = {}
  const filters: Row = {}
  let inIds: string[] | null = null

  const matches = (row: Row) =>
    Object.entries(filters).every(([k, v]) => row[k] === v) &&
    (inIds === null || inIds.includes(row.id as string))

  const run = () => {
    if (mode === 'select') {
      db.selects += 1
      return { data: db.rows.filter(matches), error: null }
    }
    if (db.failWrites) return { data: null, error: { message: 'write failed' } }
    if (mode === 'update') {
      db.updates.push({ patch, filters: { ...filters } })
      db.rows = db.rows.map(row => (matches(row) ? { ...row, ...patch } : row))
      return { data: null, error: null }
    }
    if (mode === 'delete') {
      db.rows = db.rows.filter(row => !matches(row))
      return { data: null, error: null }
    }
    const inserted = {
      id: `new-${db.rows.length + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...patch,
    }
    db.rows.push(inserted)
    return { data: inserted, error: null }
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    order: () => chain,
    range: () => chain,
    update: (p: Row) => ((mode = 'update'), (patch = p), chain),
    delete: () => ((mode = 'delete'), chain),
    insert: (p: Row) => ((mode = 'insert'), (patch = p), chain),
    eq: (k: string, v: unknown) => ((filters[k] = v), chain),
    in: (_k: string, ids: string[]) => ((inIds = ids), chain),
    single: async () => run(),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(run()).then(resolve),
  }
  return chain
}

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => builder() }) }))
const user = { id: 'user-1' }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }))
vi.mock('@/lib/haptics', () => ({ haptics: { success: vi.fn() } }))

import { useKanban } from '../useKanban'
import { onNotifyError } from '@/lib/notify'

function task(id: string, overrides: Row = {}): Row {
  return {
    id,
    user_id: 'user-1',
    board_id: 'board-a',
    title: `Task ${id}`,
    description: null,
    status: 'todo',
    priority: 'medium',
    labels: [],
    subtasks: [],
    due_date: null,
    order: 1,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    completed_at: null,
    archived_at: null,
    snoozed_until: null,
    ...overrides,
  }
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  db.rows = [task('t1'), task('t2', { board_id: 'board-b' })]
  db.selects = 0
  db.failWrites = false
  db.updates = []
})

describe('useKanban', () => {
  it('loads once and shares one copy between every caller', async () => {
    const { result } = renderHook(
      () => ({ board: useKanban('board-a'), sidebar: useKanban(), stats: useKanban('board-a') }),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.sidebar.tasks).toHaveLength(2))

    expect(db.selects).toBe(1)
    expect(result.current.board.tasks.map(t => t.id)).toEqual(['t1'])

    await act(async () => {
      await result.current.board.moveTask('t1', 'complete')
    })

    // The change made through one caller is visible to the others.
    await waitFor(() =>
      expect(result.current.sidebar.tasks.find(t => t.id === 't1')?.column).toBe('complete'),
    )
    expect(result.current.stats.tasks[0].column).toBe('complete')
    expect(result.current.stats.tasks[0].completedAt).toBeTypeOf('number')
    expect(db.rows.find(r => r.id === 't1')?.status).toBe('complete')
    expect(db.selects).toBe(1)
  })

  it('puts the task back and tells the user when a save fails', async () => {
    const messages: string[] = []
    const stop = onNotifyError(m => messages.push(m))
    const { result } = renderHook(() => useKanban('board-a'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tasks).toHaveLength(1))

    db.failWrites = true
    await act(async () => {
      await result.current.moveTask('t1', 'in-progress')
    })

    expect(messages).toEqual(['Could not move the task.'])
    await waitFor(() => expect(result.current.tasks[0].column).toBe('todo'))
    expect(db.rows.find(r => r.id === 't1')?.status).toBe('todo')
    stop()
  })

  it('restores a task whose delete failed', async () => {
    const { result } = renderHook(() => useKanban('board-a'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tasks).toHaveLength(1))

    db.failWrites = true
    await act(async () => {
      await result.current.deleteTask('t1')
    })
    await waitFor(() => expect(result.current.tasks.map(t => t.id)).toEqual(['t1']))
  })

  it('adds a task to the board it was created on', async () => {
    const { result } = renderHook(
      () => ({ a: useKanban('board-a'), b: useKanban('board-b') }),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.a.tasks).toHaveLength(1))

    await act(async () => {
      await result.current.a.addTask('Write tests', 'todo')
    })
    await waitFor(() => expect(result.current.a.tasks.map(t => t.title)).toContain('Write tests'))
    expect(result.current.b.tasks).toHaveLength(1)
  })

  it('saves a cleared due date', async () => {
    db.rows = [task('t1', { due_date: '2026-11-20T00:00:00.000Z' })]
    const { result } = renderHook(() => useKanban('board-a'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tasks[0]?.dueDate).toBeTypeOf('number'))

    await act(async () => {
      await result.current.updateTask('t1', { dueDate: undefined })
    })
    await waitFor(() => expect(result.current.tasks[0].dueDate).toBeUndefined())
    expect(db.rows[0].due_date).toBeNull()
  })

  it('toggles a subtask using the latest cached task', async () => {
    db.rows = [task('t1', { subtasks: [{ id: 's1', text: 'a', completed: false }] })]
    const { result } = renderHook(() => useKanban('board-a'), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tasks).toHaveLength(1))

    await act(async () => {
      await result.current.toggleSubtask('t1', 's1')
      await result.current.addSubtask('t1', 'b')
    })
    await waitFor(() =>
      expect(result.current.tasks[0].subtasks.map(s => [s.text, s.completed])).toEqual([
        ['a', true],
        ['b', false],
      ]),
    )
  })
})
