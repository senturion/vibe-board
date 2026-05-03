import { describe, it, expect } from 'vitest'
import { getNotes, appendNote } from '../../tools/notes'

const OWNER = '00000000-0000-0000-0000-000000000001'

type Call = { table: string; method: string; args: unknown[] }

function fakeClient(rowsByTable: Record<string, unknown[]>) {
  const calls: Call[] = []
  // Stateful row for `notes`: starts as the initial row (or null), mutates on update/insert.
  let notesRow: Record<string, unknown> | null =
    (rowsByTable.notes?.[0] as Record<string, unknown> | undefined) ?? null

  const builder = (table: string) => {
    const chain: Record<string, unknown> = {}
    let pendingMutation: 'update' | 'insert' | null = null
    let pendingValues: Record<string, unknown> | null = null

    const record = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args })
      return chain
    }

    chain.select = (...a: unknown[]) => record('select', ...a)
    chain.insert = (...a: unknown[]) => {
      if (table === 'notes') {
        pendingMutation = 'insert'
        pendingValues = a[0] as Record<string, unknown>
      }
      return record('insert', ...a)
    }
    chain.update = (...a: unknown[]) => {
      if (table === 'notes') {
        pendingMutation = 'update'
        pendingValues = a[0] as Record<string, unknown>
      }
      return record('update', ...a)
    }
    chain.upsert = (...a: unknown[]) => record('upsert', ...a)
    chain.eq = (...a: unknown[]) => record('eq', ...a)
    chain.in = (...a: unknown[]) => record('in', ...a)
    chain.contains = (...a: unknown[]) => record('contains', ...a)
    chain.gte = (...a: unknown[]) => record('gte', ...a)
    chain.lte = (...a: unknown[]) => record('lte', ...a)
    chain.order = (...a: unknown[]) => record('order', ...a)
    chain.limit = (...a: unknown[]) => record('limit', ...a)

    const applyPending = () => {
      if (table !== 'notes' || !pendingMutation || !pendingValues) return
      if (pendingMutation === 'update') {
        notesRow = { ...(notesRow ?? {}), ...pendingValues }
      } else {
        notesRow = { ...pendingValues }
      }
      pendingMutation = null
      pendingValues = null
    }

    chain.maybeSingle = () => {
      if (table === 'notes') {
        applyPending()
        return Promise.resolve({ data: notesRow, error: null })
      }
      return Promise.resolve({
        data: rowsByTable[table]?.[0] ?? null,
        error: null,
      })
    }
    chain.single = () => {
      if (table === 'notes') {
        applyPending()
        return Promise.resolve({ data: notesRow, error: null })
      }
      return Promise.resolve({
        data: rowsByTable[table]?.[0] ?? null,
        error: null,
      })
    }
    chain.then = (resolve: (v: unknown) => unknown) => {
      if (table === 'notes') {
        applyPending()
      }
      return Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(
        resolve,
      )
    }
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

describe('getNotes', () => {
  it('returns existing row { content, updated_at } scoped by user_id', async () => {
    const row = {
      id: 'n1',
      user_id: OWNER,
      content: 'hello world',
      updated_at: '2026-04-01T00:00:00.000Z',
    }
    const { deps: d, calls } = deps({ notes: [row] })

    const result = await getNotes({}, d)

    const notesCalls = calls.filter((c) => c.table === 'notes')
    expect(notesCalls[0]).toMatchObject({ table: 'notes', method: 'select' })

    const userEq = notesCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'user_id',
    )
    expect(userEq?.args[1]).toBe(OWNER)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            content: 'hello world',
            updated_at: '2026-04-01T00:00:00.000Z',
          }),
        },
      ],
    })
  })

  it('returns { content: "", updated_at: null } when no row exists', async () => {
    const { deps: d, calls } = deps({ notes: [] })

    const result = await getNotes({}, d)

    const notesCalls = calls.filter((c) => c.table === 'notes')
    const userEq = notesCalls.find(
      (c) => c.method === 'eq' && c.args[0] === 'user_id',
    )
    expect(userEq?.args[1]).toBe(OWNER)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ content: '', updated_at: null }),
        },
      ],
    })
  })
})

describe('appendNote', () => {
  it('with existing row: selects then updates by id, scoped by user_id', async () => {
    const existing = {
      id: 'n1',
      user_id: OWNER,
      content: 'first line',
      updated_at: '2026-04-01T00:00:00.000Z',
    }
    const { deps: d, calls } = deps({ notes: [existing] })

    const result = await appendNote({ text: 'second line' }, d)

    const notesCalls = calls.filter((c) => c.table === 'notes')

    // Must NOT use upsert
    expect(notesCalls.find((c) => c.method === 'upsert')).toBeUndefined()

    // First op: select existing row
    expect(notesCalls[0]).toMatchObject({ table: 'notes', method: 'select' })

    // Update path with concatenated content
    const updateCall = notesCalls.find((c) => c.method === 'update')
    expect(updateCall).toBeDefined()
    const updatedRow = updateCall?.args[0] as {
      content: string
      updated_at: string
    }
    expect(updatedRow.content).toBe('first line\n\nsecond line')
    expect(typeof updatedRow.updated_at).toBe('string')

    // Update is scoped by id AND user_id
    const eqCalls = notesCalls.filter((c) => c.method === 'eq')
    const idEq = eqCalls.find((c) => c.args[0] === 'id')
    const userEq = eqCalls.find((c) => c.args[0] === 'user_id')
    expect(idEq?.args[1]).toBe('n1')
    expect(userEq?.args[1]).toBe(OWNER)

    // Read-back via .select(...).single() chained to update
    const selectCalls = notesCalls.filter((c) => c.method === 'select')
    expect(selectCalls.length).toBeGreaterThanOrEqual(2)

    // Result returns new state
    const parsed = JSON.parse(result.content[0].text) as {
      content: string
      updated_at: string
    }
    expect(parsed.content).toBe('first line\n\nsecond line')
    expect(typeof parsed.updated_at).toBe('string')
  })

  it('with no existing row: inserts text alone, no leading separator', async () => {
    const { deps: d, calls } = deps({ notes: [] })

    const result = await appendNote({ text: 'fresh start' }, d)

    const notesCalls = calls.filter((c) => c.table === 'notes')

    // Must NOT use upsert
    expect(notesCalls.find((c) => c.method === 'upsert')).toBeUndefined()

    // First op: initial select (returns null)
    expect(notesCalls[0]).toMatchObject({ table: 'notes', method: 'select' })

    // Insert path with just the text
    const insertCall = notesCalls.find((c) => c.method === 'insert')
    expect(insertCall).toBeDefined()
    const insertedRow = insertCall?.args[0] as {
      user_id: string
      content: string
    }
    expect(insertedRow.user_id).toBe(OWNER)
    expect(insertedRow.content).toBe('fresh start')

    // Read-back via .select(...).single() chained to insert
    const selectCalls = notesCalls.filter((c) => c.method === 'select')
    expect(selectCalls.length).toBeGreaterThanOrEqual(2)

    // No update should have been issued
    expect(notesCalls.find((c) => c.method === 'update')).toBeUndefined()

    const parsed = JSON.parse(result.content[0].text) as {
      content: string
      updated_at: string | null
    }
    expect(parsed.content).toBe('fresh start')
  })

  it('with custom separator', async () => {
    const existing = {
      id: 'n1',
      user_id: OWNER,
      content: 'top',
      updated_at: '2026-04-01T00:00:00.000Z',
    }
    const { deps: d, calls } = deps({ notes: [existing] })

    await appendNote({ text: 'bottom', separator: '\n---\n' }, d)

    const notesCalls = calls.filter((c) => c.table === 'notes')

    // Must NOT use upsert
    expect(notesCalls.find((c) => c.method === 'upsert')).toBeUndefined()

    const updateCall = notesCalls.find((c) => c.method === 'update')
    expect(updateCall).toBeDefined()
    const updatedRow = updateCall?.args[0] as { content: string }
    expect(updatedRow.content).toBe('top\n---\nbottom')
  })
})
