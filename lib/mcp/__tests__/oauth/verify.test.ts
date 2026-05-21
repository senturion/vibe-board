import { describe, it, expect, vi } from 'vitest'
import { verifyAccessToken } from '../../oauth/verify'
import type { TokenRow } from '../../oauth/tokensStore'

function row(over: Partial<TokenRow> = {}): TokenRow {
  return {
    access_token: 'at_x',
    refresh_token: 'rt_x',
    client_id: 'mcp_x',
    user_id: '00000000-0000-0000-0000-000000000001',
    resource: 'https://example.com/api/mcp',
    scopes: [],
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    refresh_expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    revoked_at: null,
    created_at: new Date().toISOString(),
    ...over,
  }
}

describe('verifyAccessToken', () => {
  it('returns AuthInfo for valid non-expired non-revoked token with matching audience', async () => {
    const r = row()
    const find = vi.fn(async () => r)
    const result = await verifyAccessToken('at_x', 'https://example.com/api/mcp', { findByAccessToken: find })
    expect(find).toHaveBeenCalledWith('at_x')
    expect(result).toEqual({ user_id: r.user_id, client_id: r.client_id, scopes: [], resource: r.resource })
  })

  it('returns null for empty token', async () => {
    expect(await verifyAccessToken('', 'https://example.com/api/mcp', { findByAccessToken: vi.fn() })).toBeNull()
  })

  it('returns null for unknown token', async () => {
    expect(
      await verifyAccessToken('at_x', 'https://example.com/api/mcp', { findByAccessToken: vi.fn(async () => null) }),
    ).toBeNull()
  })

  it('returns null for expired token', async () => {
    const r = row({ expires_at: new Date(Date.now() - 1000).toISOString() })
    expect(
      await verifyAccessToken('at_x', 'https://example.com/api/mcp', { findByAccessToken: vi.fn(async () => r) }),
    ).toBeNull()
  })

  it('returns null for revoked token', async () => {
    const r = row({ revoked_at: new Date().toISOString() })
    expect(
      await verifyAccessToken('at_x', 'https://example.com/api/mcp', { findByAccessToken: vi.fn(async () => r) }),
    ).toBeNull()
  })

  it('returns null when audience does not match request resource', async () => {
    const r = row({ resource: 'https://other.example.com/api/mcp' })
    expect(
      await verifyAccessToken('at_x', 'https://example.com/api/mcp', { findByAccessToken: vi.fn(async () => r) }),
    ).toBeNull()
  })

  it('accepts a token with null resource (legacy / no binding)', async () => {
    const r = row({ resource: null })
    const result = await verifyAccessToken('at_x', 'https://example.com/api/mcp', { findByAccessToken: vi.fn(async () => r) })
    expect(result).not.toBeNull()
    expect(result?.resource).toBeNull()
  })
})
