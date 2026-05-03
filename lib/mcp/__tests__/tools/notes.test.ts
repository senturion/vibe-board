import { describe, it, expect } from 'vitest'
import { getNotes, appendNote } from '../../tools/notes'

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
    chain.upsert = (...a: unknown[]) => record('upsert', ...a)
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
  it('with existing row: concatenates existing + separator + text and upserts', async () => {
    const existing = {
      id: 'n1',
      user_id: OWNER,
      content: 'first line',
      updated_at: '2026-04-01T00:00:00.000Z',
    }
    const { deps: d, calls } = deps({ notes: [existing] })

    const result = await appendNote({ text: 'second line' }, d)

    const notesCalls = calls.filter((c) => c.table === 'notes')

    // upsert called with concatenated content
    const upsertCall = notesCalls.find((c) => c.method === 'upsert')
    expect(upsertCall).toBeDefined()
    const upsertedRow = upsertCall?.args[0] as {
      user_id: string
      content: string
      updated_at: string
    }
    expect(upsertedRow.user_id).toBe(OWNER)
    expect(upsertedRow.content).toBe('first line\n\nsecond line')
    expect(typeof upsertedRow.updated_at).toBe('string')

    // upsert second arg includes onConflict: 'user_id'
    expect(upsertCall?.args[1]).toMatchObject({ onConflict: 'user_id' })

    // result returns new state
    const parsed = JSON.parse(result.content[0].text) as {
      content: string
      updated_at: string
    }
    expect(parsed.content).toBe('first line\n\nsecond line')
    expect(typeof parsed.updated_at).toBe('string')
  })

  it('with no existing row: new_content = text alone, no leading separator', async () => {
    const { deps: d, calls } = deps({ notes: [] })

    const result = await appendNote({ text: 'fresh start' }, d)

    const notesCalls = calls.filter((c) => c.table === 'notes')

    const upsertCall = notesCalls.find((c) => c.method === 'upsert')
    expect(upsertCall).toBeDefined()
    const upsertedRow = upsertCall?.args[0] as {
      user_id: string
      content: string
      updated_at: string
    }
    expect(upsertedRow.user_id).toBe(OWNER)
    expect(upsertedRow.content).toBe('fresh start')
    expect(typeof upsertedRow.updated_at).toBe('string')

    expect(upsertCall?.args[1]).toMatchObject({ onConflict: 'user_id' })

    const parsed = JSON.parse(result.content[0].text) as {
      content: string
      updated_at: string
    }
    expect(parsed.content).toBe('fresh start')
    expect(typeof parsed.updated_at).toBe('string')
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

    const upsertCall = calls
      .filter((c) => c.table === 'notes')
      .find((c) => c.method === 'upsert')
    const upsertedRow = upsertCall?.args[0] as { content: string }
    expect(upsertedRow.content).toBe('top\n---\nbottom')
  })
})
