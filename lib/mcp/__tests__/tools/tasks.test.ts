import { describe, it, expect } from 'vitest'
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
} from '../../tools/tasks'

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

describe('listTasks', () => {
  it('returns rows scoped by user_id with default ordering and limit', async () => {
    const rows = [
      { id: 't1', title: 'one', user_id: OWNER },
      { id: 't2', title: 'two', user_id: OWNER },
    ]
    const { deps: d, calls } = deps({ tasks: rows })
    const result = await listTasks({}, d)

    expect(calls[0]).toMatchObject({ table: 'tasks', method: 'select' })
    expect(calls.find((c) => c.method === 'eq' && c.args[0] === 'user_id')?.args[1]).toBe(OWNER)
    const orderCalls = calls.filter((c) => c.method === 'order')
    expect(orderCalls[0].args[0]).toBe('due_date')
    expect(orderCalls[1].args[0]).toBe('order')
    const limitCall = calls.find((c) => c.method === 'limit')
    expect(limitCall?.args[0]).toBe(100)

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(rows) }],
    })
  })

  it('applies board_id, status, due_before, due_after, and labels filters', async () => {
    const { deps: d, calls } = deps({ tasks: [] })
    await listTasks(
      {
        board_id: 'b1',
        status: 'todo',
        due_before: '2026-06-01T00:00:00.000Z',
        due_after: '2026-05-01T00:00:00.000Z',
        labels: ['urgent', 'home'],
      },
      d,
    )

    const eqArgs = calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toEqual(
      expect.arrayContaining([
        ['user_id', OWNER],
        ['board_id', 'b1'],
        ['status', 'todo'],
      ]),
    )
    const lte = calls.find((c) => c.method === 'lte')
    const gte = calls.find((c) => c.method === 'gte')
    expect(lte?.args).toEqual(['due_date', '2026-06-01T00:00:00.000Z'])
    expect(gte?.args).toEqual(['due_date', '2026-05-01T00:00:00.000Z'])
    const contains = calls.find((c) => c.method === 'contains')
    expect(contains?.args).toEqual(['labels', ['urgent', 'home']])
  })
})

describe('getTask', () => {
  it('selects single row by id and user_id', async () => {
    const row = { id: 't1', title: 'one', user_id: OWNER }
    const { deps: d, calls } = deps({ tasks: [row] })
    const result = await getTask({ id: 't1' }, d)

    expect(calls[0]).toMatchObject({ table: 'tasks', method: 'select' })
    const eqArgs = calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toEqual(
      expect.arrayContaining([
        ['id', 't1'],
        ['user_id', OWNER],
      ]),
    )
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(row) }],
    })
  })
})

describe('createTask', () => {
  it('inserts with user_id and returns the created row', async () => {
    const created = { id: 'new', title: 'hi', user_id: OWNER, board_id: 'b1' }
    const { deps: d, calls } = deps({ tasks: [created] })
    const result = await createTask(
      { board_id: 'b1', title: 'hi', description: 'd', labels: ['x'] },
      d,
    )

    const insertCall = calls.find((c) => c.method === 'insert')
    expect(insertCall?.table).toBe('tasks')
    const payload = insertCall?.args[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      board_id: 'b1',
      title: 'hi',
      description: 'd',
      labels: ['x'],
      user_id: OWNER,
    })
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(created) }],
    })
  })
})

describe('updateTask', () => {
  it('updates by id+user_id, maps order, sets updated_at, returns row', async () => {
    const updated = { id: 't1', title: 'renamed', user_id: OWNER, order: 5 }
    const { deps: d, calls } = deps({ tasks: [updated] })
    const result = await updateTask(
      { id: 't1', patch: { title: 'renamed', order: 5 } },
      d,
    )

    const updateCall = calls.find((c) => c.method === 'update')
    expect(updateCall?.table).toBe('tasks')
    const payload = updateCall?.args[0] as Record<string, unknown>
    expect(payload).toMatchObject({ title: 'renamed', order: 5 })
    expect(typeof payload.updated_at).toBe('string')
    expect('order' in payload).toBe(true)

    const eqArgs = calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toEqual(
      expect.arrayContaining([
        ['id', 't1'],
        ['user_id', OWNER],
      ]),
    )
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(updated) }],
    })
  })
})

describe('completeTask', () => {
  it('sets status=done, completed_at, updated_at and scopes by user_id', async () => {
    const done = { id: 't1', user_id: OWNER, status: 'done' }
    const { deps: d, calls } = deps({ tasks: [done] })
    const result = await completeTask({ id: 't1' }, d)

    const updateCall = calls.find((c) => c.method === 'update')
    const payload = updateCall?.args[0] as Record<string, unknown>
    expect(payload.status).toBe('done')
    expect(typeof payload.completed_at).toBe('string')
    expect(typeof payload.updated_at).toBe('string')

    const eqArgs = calls.filter((c) => c.method === 'eq').map((c) => c.args)
    expect(eqArgs).toEqual(
      expect.arrayContaining([
        ['id', 't1'],
        ['user_id', OWNER],
      ]),
    )
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(done) }],
    })
  })
})
