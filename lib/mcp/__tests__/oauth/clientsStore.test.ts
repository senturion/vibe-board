import { describe, it, expect } from 'vitest'
import { registerClient, getClient } from '../../oauth/clientsStore'

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
    chain.eq = (...a: unknown[]) => record('eq', ...a)
    chain.maybeSingle = () =>
      Promise.resolve({ data: rowsByTable[table]?.[0] ?? null, error: null })
    chain.single = () =>
      Promise.resolve({ data: rowsByTable[table]?.[0] ?? null, error: null })
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
    },
    calls: fake.calls,
  }
}

describe('registerClient', () => {
  it('inserts a row with generated client_id and defaults, returns the row', async () => {
    // seed the row that supabase will "return" — content doesn't matter for the assertions below
    const seeded = { client_id: 'placeholder', client_name: 'claude.ai' }
    const { deps: d, calls } = deps({ mcp_oauth_clients: [seeded] })

    const result = await registerClient(
      {
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        client_name: 'claude.ai',
      },
      d,
    )

    // from('mcp_oauth_clients') was called
    expect(calls.some((c) => c.table === 'mcp_oauth_clients')).toBe(true)

    // .insert(rowArg) inspect
    const insertCall = calls.find((c) => c.method === 'insert')
    expect(insertCall).toBeDefined()
    const rowArg = insertCall!.args[0] as {
      client_id: string
      client_name: string | null
      token_endpoint_auth_method: string
      grant_types: string[]
      redirect_uris: string[]
    }
    expect(rowArg.client_id).toMatch(/^mcp_[A-Za-z0-9_-]{43}$/)
    expect(rowArg.token_endpoint_auth_method).toBe('none')
    expect(rowArg.grant_types).toEqual(['authorization_code', 'refresh_token'])
    expect(rowArg.client_name).toBe('claude.ai')
    expect(rowArg.redirect_uris).toEqual([
      'https://claude.ai/api/mcp/auth_callback',
    ])

    // returns whatever supabase returns
    expect(result).toBe(seeded)
  })

  it('honors explicit token_endpoint_auth_method override', async () => {
    const { deps: d, calls } = deps({ mcp_oauth_clients: [{ client_id: 'x' }] })

    await registerClient(
      {
        redirect_uris: ['https://example.com/cb'],
        token_endpoint_auth_method: 'client_secret_basic',
      },
      d,
    )

    const insertCall = calls.find((c) => c.method === 'insert')
    const rowArg = insertCall!.args[0] as { token_endpoint_auth_method: string }
    expect(rowArg.token_endpoint_auth_method).toBe('client_secret_basic')
  })

  it('rejects empty redirect_uris', async () => {
    const { deps: d } = deps({ mcp_oauth_clients: [] })
    await expect(
      registerClient({ redirect_uris: [] }, d),
    ).rejects.toThrow(/redirect_uris/)
  })
})

describe('getClient', () => {
  it('returns null when row is not found', async () => {
    const { deps: d, calls } = deps({ mcp_oauth_clients: [] })

    const result = await getClient('mcp_unknown', d)

    expect(result).toBeNull()
    // ensure scoping via .eq('client_id', ...)
    const eqCall = calls.find(
      (c) => c.method === 'eq' && c.args[0] === 'client_id',
    )
    expect(eqCall?.args[1]).toBe('mcp_unknown')
  })

  it('returns the seeded row when found', async () => {
    const seeded = {
      client_id: 'mcp_abc',
      client_name: 'tester',
      redirect_uris: ['https://x/cb'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      client_secret_hash: null,
      created_at: '2026-01-01T00:00:00.000Z',
    }
    const { deps: d } = deps({ mcp_oauth_clients: [seeded] })

    const result = await getClient('mcp_abc', d)

    expect(result).toEqual(seeded)
  })
})
