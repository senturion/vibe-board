import { describe, it, expect } from 'vitest'
import {
  issueTokens,
  findByAccessToken,
  findByRefreshToken,
  revoke,
  rotateFromRefresh,
} from '../../oauth/tokensStore'

type Call = { table: string; method: string; args: unknown[] }

type TokenRow = {
  access_token: string
  client_id: string
  created_at: string
  expires_at: string
  refresh_expires_at: string | null
  refresh_token: string | null
  resource: string | null
  revoked_at: string | null
  scopes: string[] | null
  user_id: string
}

/**
 * Stateful fake that simulates the `mcp_oauth_tokens` table. Supports:
 *  - insert(...).select().single()  → appends row and returns it
 *  - select('*').eq(col, val).maybeSingle() → finds matching row
 *  - update({...}).eq(col, val).is(col, val).select().maybeSingle()
 *  - update({...}).eq(col, val) (no select) → mutates without return
 */
function fakeClient(initialRows: TokenRow[] = []) {
  const calls: Call[] = []
  const rows: TokenRow[] = [...initialRows]

  const builder = (table: string) => {
    let pendingMutation: 'update' | 'insert' | 'select' | null = null
    let pendingValues: Record<string, unknown> | null = null
    const filters: { method: string; col: string; val: unknown }[] = []

    const chain: Record<string, unknown> = {}
    const record = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args })
      return chain
    }

    chain.select = (...a: unknown[]) => {
      if (pendingMutation === null) pendingMutation = 'select'
      return record('select', ...a)
    }
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

    const matchesFilters = (row: TokenRow): boolean => {
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

    const applyPending = (): TokenRow | null => {
      if (table !== 'mcp_oauth_tokens') return null
      if (pendingMutation === 'insert' && pendingValues) {
        const inserted = { ...(pendingValues as unknown as TokenRow) }
        rows.push(inserted)
        pendingMutation = null
        pendingValues = null
        return inserted
      }
      if (pendingMutation === 'select') {
        const found = rows.find(matchesFilters) ?? null
        pendingMutation = null
        return found
      }
      if (pendingMutation === 'update' && pendingValues) {
        const idx = rows.findIndex(matchesFilters)
        if (idx === -1) {
          pendingMutation = null
          pendingValues = null
          return null
        }
        rows[idx] = { ...rows[idx], ...(pendingValues as Partial<TokenRow>) }
        const updated = rows[idx]
        pendingMutation = null
        pendingValues = null
        return updated
      }
      return null
    }

    chain.single = () => {
      const result = applyPending()
      return Promise.resolve({ data: result, error: null })
    }
    chain.maybeSingle = () => {
      const result = applyPending()
      return Promise.resolve({ data: result, error: null })
    }
    // Allow awaiting the builder directly (for update without select)
    chain.then = (
      resolve: (v: { data: null; error: null }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => {
      try {
        applyPending()
        return Promise.resolve({ data: null, error: null }).then(resolve, reject)
      } catch (e) {
        return Promise.reject(e).then(resolve, reject)
      }
    }
    return chain
  }

  return { client: { from: builder }, calls, rows }
}

const deps = (initialRows: TokenRow[] = []) => {
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
}

describe('issueTokens', () => {
  it('inserts row with at_/rt_ tokens, ~1h access expiry, ~30d refresh expiry', async () => {
    const { deps: d, calls } = deps()

    const before = Date.now()
    const result = await issueTokens(baseInput, d)
    const after = Date.now()

    const insertCall = calls.find((c) => c.method === 'insert')
    expect(insertCall).toBeDefined()
    const rowArg = insertCall!.args[0] as TokenRow

    expect(rowArg.access_token).toMatch(/^at_[A-Za-z0-9_-]{43}$/)
    expect(rowArg.refresh_token).toMatch(/^rt_[A-Za-z0-9_-]{43}$/)
    expect(rowArg.client_id).toBe(baseInput.client_id)
    expect(rowArg.user_id).toBe(baseInput.user_id)
    expect(rowArg.resource).toBeNull()
    expect(rowArg.scopes).toBeNull()
    expect(rowArg.revoked_at).toBeNull()

    const expMs = Date.parse(rowArg.expires_at)
    expect(expMs).toBeGreaterThanOrEqual(before + 3_600_000 - 5_000)
    expect(expMs).toBeLessThanOrEqual(after + 3_600_000 + 5_000)

    const refExpMs = Date.parse(rowArg.refresh_expires_at as string)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    expect(refExpMs).toBeGreaterThanOrEqual(before + thirtyDays - 5_000)
    expect(refExpMs).toBeLessThanOrEqual(after + thirtyDays + 5_000)

    expect(result.access_token).toBe(rowArg.access_token)
  })

  it('honors custom accessTtlSeconds and refreshTtlSeconds', async () => {
    const { deps: d, calls } = deps()

    const before = Date.now()
    await issueTokens(
      { ...baseInput, accessTtlSeconds: 60, refreshTtlSeconds: 120 },
      d,
    )
    const after = Date.now()

    const insertCall = calls.find((c) => c.method === 'insert')
    const rowArg = insertCall!.args[0] as TokenRow
    const expMs = Date.parse(rowArg.expires_at)
    expect(expMs).toBeGreaterThanOrEqual(before + 60_000 - 5_000)
    expect(expMs).toBeLessThanOrEqual(after + 60_000 + 5_000)

    const refExpMs = Date.parse(rowArg.refresh_expires_at as string)
    expect(refExpMs).toBeGreaterThanOrEqual(before + 120_000 - 5_000)
    expect(refExpMs).toBeLessThanOrEqual(after + 120_000 + 5_000)
  })
})

describe('findByAccessToken', () => {
  it('returns row for known access token', async () => {
    const seeded: TokenRow = {
      access_token: 'at_known',
      refresh_token: 'rt_known',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      refresh_expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
      resource: null,
      scopes: null,
      revoked_at: null,
    }
    const { deps: d } = deps([seeded])

    const found = await findByAccessToken('at_known', d)
    expect(found).not.toBeNull()
    expect(found!.access_token).toBe('at_known')
  })

  it('returns null for unknown access token', async () => {
    const { deps: d } = deps([])
    const found = await findByAccessToken('at_missing', d)
    expect(found).toBeNull()
  })
})

describe('findByRefreshToken', () => {
  it('returns row for known refresh token', async () => {
    const seeded: TokenRow = {
      access_token: 'at_x',
      refresh_token: 'rt_known',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      refresh_expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
      resource: null,
      scopes: null,
      revoked_at: null,
    }
    const { deps: d } = deps([seeded])

    const found = await findByRefreshToken('rt_known', d)
    expect(found).not.toBeNull()
    expect(found!.refresh_token).toBe('rt_known')
  })
})

describe('revoke', () => {
  it('sets revoked_at on the matching row', async () => {
    const seeded: TokenRow = {
      access_token: 'at_to_revoke',
      refresh_token: 'rt_x',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      refresh_expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
      resource: null,
      scopes: null,
      revoked_at: null,
    }
    const { deps: d, rows } = deps([seeded])

    await revoke('at_to_revoke', d)
    expect(rows[0].revoked_at).not.toBeNull()
  })
})

describe('rotateFromRefresh', () => {
  it('revokes old row and issues a new pair carrying fields forward', async () => {
    const seeded: TokenRow = {
      access_token: 'at_old',
      refresh_token: 'rt_old',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      refresh_expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
      resource: 'https://vibe-board.example.com/api/mcp',
      scopes: ['mcp:read', 'mcp:write'],
      revoked_at: null,
    }
    const { deps: d, rows } = deps([seeded])

    const result = await rotateFromRefresh('rt_old', d)
    expect(result).not.toBeNull()
    expect(result!.old.access_token).toBe('at_old')
    // Old row in storage is now revoked
    const oldRow = rows.find((r) => r.access_token === 'at_old')
    expect(oldRow!.revoked_at).not.toBeNull()

    // Fresh row is present, with new tokens and same context fields
    expect(result!.fresh.access_token).toMatch(/^at_[A-Za-z0-9_-]{43}$/)
    expect(result!.fresh.refresh_token).toMatch(/^rt_[A-Za-z0-9_-]{43}$/)
    expect(result!.fresh.access_token).not.toBe('at_old')
    expect(result!.fresh.refresh_token).not.toBe('rt_old')
    expect(result!.fresh.client_id).toBe(baseInput.client_id)
    expect(result!.fresh.user_id).toBe(baseInput.user_id)
    expect(result!.fresh.resource).toBe('https://vibe-board.example.com/api/mcp')
    expect(result!.fresh.scopes).toEqual(['mcp:read', 'mcp:write'])
    expect(result!.fresh.revoked_at).toBeNull()
  })

  it('returns null when refresh token is unknown', async () => {
    const { deps: d } = deps([])
    const result = await rotateFromRefresh('rt_missing', d)
    expect(result).toBeNull()
  })

  it('returns null when refresh token row is already revoked', async () => {
    const seeded: TokenRow = {
      access_token: 'at_dead',
      refresh_token: 'rt_dead',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      refresh_expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
      resource: null,
      scopes: null,
      revoked_at: new Date(Date.now() - 1000).toISOString(),
    }
    const { deps: d } = deps([seeded])

    const result = await rotateFromRefresh('rt_dead', d)
    expect(result).toBeNull()
  })

  it('returns null when refresh_expires_at has passed', async () => {
    const seeded: TokenRow = {
      access_token: 'at_stale',
      refresh_token: 'rt_stale',
      client_id: baseInput.client_id,
      user_id: baseInput.user_id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      refresh_expires_at: new Date(Date.now() - 1000).toISOString(),
      resource: null,
      scopes: null,
      revoked_at: null,
    }
    const { deps: d } = deps([seeded])

    const result = await rotateFromRefresh('rt_stale', d)
    expect(result).toBeNull()
  })
})
