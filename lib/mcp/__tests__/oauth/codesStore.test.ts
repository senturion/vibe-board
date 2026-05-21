import { describe, it, expect } from 'vitest'
import { createCode, consumeCode } from '../../oauth/codesStore'

type Call = { table: string; method: string; args: unknown[] }

type CodeRow = {
  client_id: string
  code: string
  code_challenge: string
  code_challenge_method: string
  consumed_at: string | null
  expires_at: string
  redirect_uri: string
  resource: string | null
  scopes: string[] | null
  user_id: string
}

/**
 * Stateful fake that simulates the `mcp_oauth_codes` table. Supports:
 *  - insert(...).select().single()  → appends row and returns it
 *  - update({consumed_at}).eq('code', x).is('consumed_at', null).gt('expires_at', now)
 *      .select().maybeSingle() → only matches/mutates if all filters pass
 */
function fakeClient(initialRows: CodeRow[] = []) {
  const calls: Call[] = []
  const rows: CodeRow[] = [...initialRows]

  const builder = (table: string) => {
    let pendingMutation: 'update' | 'insert' | null = null
    let pendingValues: Record<string, unknown> | null = null
    const filters: { method: string; col: string; val: unknown }[] = []

    const chain: Record<string, unknown> = {}
    const record = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args })
      return chain
    }

    chain.select = (...a: unknown[]) => record('select', ...a)
    chain.insert = (...a: unknown[]) => {
      pendingMutation = 'insert'
      pendingValues = a[0] as Record<string, unknown>
      return record('insert', ...a)
    }
    chain.update = (...a: unknown[]) => {
      pendingMutation = 'update'
      pendingValues = a[0] as Record<string, unknown>
      return record('update', ...a)
    }
    chain.eq = (col: string, val: unknown) => {
      filters.push({ method: 'eq', col, val })
      return record('eq', col, val)
    }
    chain.is = (col: string, val: unknown) => {
      filters.push({ method: 'is', col, val })
      return record('is', col, val)
    }
    chain.gt = (col: string, val: unknown) => {
      filters.push({ method: 'gt', col, val })
      return record('gt', col, val)
    }

    const matchesFilters = (row: CodeRow): boolean => {
      for (const f of filters) {
        const cell = (row as unknown as Record<string, unknown>)[f.col]
        if (f.method === 'eq' && cell !== f.val) return false
        if (f.method === 'is' && cell !== f.val) return false
        if (f.method === 'gt') {
          if (typeof cell !== 'string' || typeof f.val !== 'string') return false
          if (!(cell > f.val)) return false
        }
      }
      return true
    }

    const applyPending = (): CodeRow | null => {
      if (table !== 'mcp_oauth_codes' || !pendingMutation || !pendingValues) {
        return null
      }
      if (pendingMutation === 'insert') {
        const inserted = { ...(pendingValues as unknown as CodeRow) }
        rows.push(inserted)
        pendingMutation = null
        pendingValues = null
        return inserted
      }
      // update path: must match all filters
      const idx = rows.findIndex(matchesFilters)
      if (idx === -1) {
        pendingMutation = null
        pendingValues = null
        return null
      }
      rows[idx] = { ...rows[idx], ...(pendingValues as Partial<CodeRow>) }
      const updated = rows[idx]
      pendingMutation = null
      pendingValues = null
      return updated
    }

    chain.single = () => {
      const result = applyPending()
      return Promise.resolve({ data: result, error: null })
    }
    chain.maybeSingle = () => {
      const result = applyPending()
      return Promise.resolve({ data: result, error: null })
    }
    return chain
  }

  return { client: { from: builder }, calls, rows }
}

const deps = (initialRows: CodeRow[] = []) => {
  const fake = fakeClient(initialRows)
  return {
    deps: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getClient: () => fake.client as any,
    },
    calls: fake.calls,
    rows: fake.rows,
  }
}

const baseInput = {
  client_id: 'mcp_abc',
  user_id: '00000000-0000-0000-0000-000000000001',
  redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
  code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
}

describe('createCode', () => {
  it('inserts a row with generated code, default S256, ~300s expiry, null consumed_at', async () => {
    const { deps: d, calls } = deps()

    const before = Date.now()
    const result = await createCode(baseInput, d)
    const after = Date.now()

    const insertCall = calls.find((c) => c.method === 'insert')
    expect(insertCall).toBeDefined()
    const rowArg = insertCall!.args[0] as CodeRow

    expect(rowArg.code).toMatch(/^code_[A-Za-z0-9_-]{43}$/)
    expect(rowArg.code_challenge_method).toBe('S256')
    expect(rowArg.consumed_at).toBeNull()
    expect(rowArg.client_id).toBe(baseInput.client_id)
    expect(rowArg.user_id).toBe(baseInput.user_id)
    expect(rowArg.redirect_uri).toBe(baseInput.redirect_uri)
    expect(rowArg.code_challenge).toBe(baseInput.code_challenge)
    expect(rowArg.resource).toBeNull()
    expect(rowArg.scopes).toBeNull()

    const expMs = Date.parse(rowArg.expires_at)
    // 300s window from "now", allow 5s slack on either side
    expect(expMs).toBeGreaterThanOrEqual(before + 300_000 - 5_000)
    expect(expMs).toBeLessThanOrEqual(after + 300_000 + 5_000)

    // returned row is what was inserted
    expect(result.code).toBe(rowArg.code)
  })

  it('honors a custom ttlSeconds', async () => {
    const { deps: d, calls } = deps()

    const before = Date.now()
    await createCode({ ...baseInput, ttlSeconds: 60 }, d)
    const after = Date.now()

    const insertCall = calls.find((c) => c.method === 'insert')
    const rowArg = insertCall!.args[0] as CodeRow
    const expMs = Date.parse(rowArg.expires_at)
    expect(expMs).toBeGreaterThanOrEqual(before + 60_000 - 5_000)
    expect(expMs).toBeLessThanOrEqual(after + 60_000 + 5_000)
  })

  it('passes through explicit resource and scopes', async () => {
    const { deps: d, calls } = deps()

    await createCode(
      {
        ...baseInput,
        resource: 'https://vibe-board.example.com/api/mcp',
        scopes: ['mcp:read', 'mcp:write'],
      },
      d,
    )

    const insertCall = calls.find((c) => c.method === 'insert')
    const rowArg = insertCall!.args[0] as CodeRow
    expect(rowArg.resource).toBe('https://vibe-board.example.com/api/mcp')
    expect(rowArg.scopes).toEqual(['mcp:read', 'mcp:write'])
  })
})

describe('consumeCode', () => {
  it('returns the row and marks it consumed on first call; returns null on second call', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    const seeded: CodeRow = {
      code: 'code_valid',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      redirect_uri: baseInput.redirect_uri,
      code_challenge: baseInput.code_challenge,
      code_challenge_method: 'S256',
      consumed_at: null,
      expires_at: future,
      resource: null,
      scopes: null,
    }
    const { deps: d, rows } = deps([seeded])

    const first = await consumeCode('code_valid', d)
    expect(first).not.toBeNull()
    expect(first!.code).toBe('code_valid')
    expect(first!.consumed_at).not.toBeNull()

    // stateful fake should have mutated the row
    expect(rows[0].consumed_at).not.toBeNull()

    const second = await consumeCode('code_valid', d)
    expect(second).toBeNull()
  })

  it('returns null when the code has already been consumed', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    const seeded: CodeRow = {
      code: 'code_used',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      redirect_uri: baseInput.redirect_uri,
      code_challenge: baseInput.code_challenge,
      code_challenge_method: 'S256',
      consumed_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: future,
      resource: null,
      scopes: null,
    }
    const { deps: d } = deps([seeded])

    const result = await consumeCode('code_used', d)
    expect(result).toBeNull()
  })

  it('returns null when the code is expired', async () => {
    const past = new Date(Date.now() - 1000).toISOString()
    const seeded: CodeRow = {
      code: 'code_expired',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      redirect_uri: baseInput.redirect_uri,
      code_challenge: baseInput.code_challenge,
      code_challenge_method: 'S256',
      consumed_at: null,
      expires_at: past,
      resource: null,
      scopes: null,
    }
    const { deps: d } = deps([seeded])

    const result = await consumeCode('code_expired', d)
    expect(result).toBeNull()
  })

  it('returns null for an unknown code', async () => {
    const { deps: d } = deps([])
    const result = await consumeCode('code_does_not_exist', d)
    expect(result).toBeNull()
  })
})
