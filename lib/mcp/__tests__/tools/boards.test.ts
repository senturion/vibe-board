import { describe, it, expect } from 'vitest'
import { listBoards } from '../../tools/boards'

const OWNER = '00000000-0000-0000-0000-000000000001'

type Call = { table: string; method: string; args: unknown[] }

function fakeClient(rowsByTable: Record<string, unknown[]>) {
  const calls: Call[] = []
  const builder = (table: string) => {
    const chain: Record<string, unknown> = {}
    const record = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args })
      return chain
    }
    chain.select = (...a: unknown[]) => record('select', ...a)
    chain.insert = (...a: unknown[]) => record('insert', ...a)
    chain.update = (...a: unknown[]) => record('update', ...a)
    chain.eq = (...a: unknown[]) => record('eq', ...a)
    chain.in = (...a: unknown[]) => record('in', ...a)
    chain.contains = (...a: unknown[]) => record('contains', ...a)
    chain.gte = (...a: unknown[]) => record('gte', ...a)
    chain.lte = (...a: unknown[]) => record('lte', ...a)
    chain.order = (...a: unknown[]) => record('order', ...a)
    chain.limit = (...a: unknown[]) => record('limit', ...a)
    chain.maybeSingle = () =>
      Promise.resolve({ data: rowsByTable[table]?.[0] ?? null, error: null })
    chain.single = () =>
      Promise.resolve({ data: rowsByTable[table]?.[0] ?? null, error: null })
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(resolve)
    return chain
  }
  return { client: { from: builder }, calls }
}

const deps = (rowsByTable: Record<string, unknown[]>) => {
  const fake = fakeClient(rowsByTable)
  return {
    deps: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getClient: () => fake.client as any,
      ownerId: () => OWNER,
    },
    calls: fake.calls,
  }
}

describe('listBoards', () => {
  it('returns boards scoped by user_id, ordered by created_at asc, with is_active flag from user_settings', async () => {
    const boards = [
      { id: 'b1', name: 'first', user_id: OWNER, created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'b2', name: 'second', user_id: OWNER, created_at: '2026-02-01T00:00:00.000Z' },
      { id: 'b3', name: 'third', user_id: OWNER, created_at: '2026-03-01T00:00:00.000Z' },
    ]
    const settings = [{ user_id: OWNER, active_board_id: 'b2' }]
    const { deps: d, calls } = deps({ boards, user_settings: settings })

    const result = await listBoards({}, d)

    // boards select scoped by user_id
    const boardsCalls = calls.filter((c) => c.table === 'boards')
    expect(boardsCalls[0]).toMatchObject({ table: 'boards', method: 'select' })
    const boardsEq = boardsCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'user_id',
    )
    expect(boardsEq?.args[1]).toBe(OWNER)
    const orderCall = boardsCalls.find((c) => c.method === 'order')
    expect(orderCall?.args[0]).toBe('created_at')
    expect(orderCall?.args[1]).toMatchObject({ ascending: true })

    // user_settings select scoped by user_id
    const settingsCalls = calls.filter((c) => c.table === 'user_settings')
    expect(settingsCalls[0]).toMatchObject({ table: 'user_settings', method: 'select' })
    const settingsEq = settingsCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'user_id',
    )
    expect(settingsEq?.args[1]).toBe(OWNER)

    // returned MCP shape: each row has is_active, only b2 is true
    const expected = [
      { ...boards[0], is_active: false },
      { ...boards[1], is_active: true },
      { ...boards[2], is_active: false },
    ]
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(expected) }],
    })
  })

  it('handles missing user_settings row — all boards have is_active: false', async () => {
    const boards = [
      { id: 'b1', name: 'first', user_id: OWNER, created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'b2', name: 'second', user_id: OWNER, created_at: '2026-02-01T00:00:00.000Z' },
    ]
    const { deps: d, calls } = deps({ boards, user_settings: [] })

    const result = await listBoards({}, d)

    // still queried user_settings scoped by user_id
    const settingsCalls = calls.filter((c) => c.table === 'user_settings')
    const settingsEq = settingsCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'user_id',
    )
    expect(settingsEq?.args[1]).toBe(OWNER)

    const expected = [
      { ...boards[0], is_active: false },
      { ...boards[1], is_active: false },
    ]
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(expected) }],
    })
  })
})
