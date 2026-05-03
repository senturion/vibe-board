import { describe, it, expect } from 'vitest'
import { listTodos, createTodo } from '../../tools/todos'

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

describe('listTodos', () => {
  it('default args: scopes by user_id, filters completed=false, orders created_at desc, limit 100', async () => {
    const todos = [
      { id: 't1', user_id: OWNER, text: 'first', completed: false, created_at: '2026-03-01T00:00:00.000Z' },
      { id: 't2', user_id: OWNER, text: 'second', completed: false, created_at: '2026-02-01T00:00:00.000Z' },
    ]
    const { deps: d, calls } = deps({ todos })

    const result = await listTodos({}, d)

    const todosCalls = calls.filter((c) => c.table === 'todos')
    expect(todosCalls[0]).toMatchObject({ table: 'todos', method: 'select' })

    const userEq = todosCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'user_id',
    )
    expect(userEq?.args[1]).toBe(OWNER)

    const completedEq = todosCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'completed',
    )
    expect(completedEq?.args[1]).toBe(false)

    const orderCall = todosCalls.find((c) => c.method === 'order')
    expect(orderCall?.args[0]).toBe('created_at')
    expect(orderCall?.args[1]).toMatchObject({ ascending: false })

    const limitCall = todosCalls.find((c) => c.method === 'limit')
    expect(limitCall?.args[0]).toBe(100)

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(todos) }],
    })
  })

  it('include_completed=true: skips completed=false filter', async () => {
    const todos = [
      { id: 't1', user_id: OWNER, text: 'a', completed: false, created_at: '2026-03-01T00:00:00.000Z' },
      { id: 't2', user_id: OWNER, text: 'b', completed: true, created_at: '2026-02-01T00:00:00.000Z' },
    ]
    const { deps: d, calls } = deps({ todos })

    const result = await listTodos({ include_completed: true }, d)

    const todosCalls = calls.filter((c) => c.table === 'todos')

    const userEq = todosCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'user_id',
    )
    expect(userEq?.args[1]).toBe(OWNER)

    const completedEq = todosCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'completed',
    )
    expect(completedEq).toBeUndefined()

    const orderCall = todosCalls.find((c) => c.method === 'order')
    expect(orderCall?.args[0]).toBe('created_at')
    expect(orderCall?.args[1]).toMatchObject({ ascending: false })

    const limitCall = todosCalls.find((c) => c.method === 'limit')
    expect(limitCall?.args[0]).toBe(100)

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(todos) }],
    })
  })
})

describe('createTodo', () => {
  it('inserts with user_id, text, completed=false; returns created row', async () => {
    const created = {
      id: 't-new',
      user_id: OWNER,
      text: 'buy milk',
      completed: false,
      created_at: '2026-04-30T00:00:00.000Z',
    }
    const { deps: d, calls } = deps({ todos: [created] })

    const result = await createTodo({ text: 'buy milk' }, d)

    const todosCalls = calls.filter((c) => c.table === 'todos')
    const insertCall = todosCalls.find((c) => c.method === 'insert')
    expect(insertCall).toBeDefined()
    expect(insertCall?.args[0]).toEqual({
      user_id: OWNER,
      text: 'buy milk',
      completed: false,
    })

    const selectCall = todosCalls.find((c) => c.method === 'select')
    expect(selectCall).toBeDefined()

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(created) }],
    })
  })
})
