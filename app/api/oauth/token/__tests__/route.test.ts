import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
}))
vi.mock('@/lib/mcp/oauth/clientsStore', () => ({
  getClient: vi.fn(),
}))
vi.mock('@/lib/mcp/oauth/codesStore', () => ({
  consumeCode: vi.fn(),
}))
vi.mock('@/lib/mcp/oauth/tokensStore', () => ({
  issueTokens: vi.fn(),
  rotateFromRefresh: vi.fn(),
}))

import { POST, GET, PUT, DELETE } from '../route'
import { getClient } from '@/lib/mcp/oauth/clientsStore'
import { consumeCode } from '@/lib/mcp/oauth/codesStore'
import { issueTokens, rotateFromRefresh } from '@/lib/mcp/oauth/tokensStore'

function challengeOf(v: string) {
  return createHash('sha256').update(v).digest('base64url')
}

function tokenReq(form: Record<string, string>): Request {
  const body = new URLSearchParams(form).toString()
  return new Request('https://example.com/api/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
}

const VERIFIER = 'v'.repeat(64)
const CHALLENGE = challengeOf(VERIFIER)

function fakeClient() {
  return {
    client_id: 'mcp_abc',
    client_name: 'Claude',
    redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
    grant_types: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'none',
    client_secret_hash: null,
    created_at: '2026-05-21T00:00:00.000Z',
  }
}

function fakeCodeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    code: 'code_abc',
    client_id: 'mcp_abc',
    user_id: 'owner-user-id',
    redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    resource: 'https://example.com/api/mcp',
    scopes: ['mcp:read', 'mcp:write'],
    consumed_at: '2026-05-21T00:00:00.000Z',
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    ...overrides,
  }
}

function fakeTokenRow(overrides: Partial<Record<string, unknown>> = {}) {
  const now = Date.now()
  return {
    access_token: 'at_freshtoken',
    refresh_token: 'rt_freshtoken',
    client_id: 'mcp_abc',
    user_id: 'owner-user-id',
    resource: 'https://example.com/api/mcp',
    scopes: ['mcp:read', 'mcp:write'],
    expires_at: new Date(now + 3600 * 1000).toISOString(),
    refresh_expires_at: new Date(now + 30 * 24 * 3600 * 1000).toISOString(),
    revoked_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(getClient).mockReset()
  vi.mocked(consumeCode).mockReset()
  vi.mocked(issueTokens).mockReset()
  vi.mocked(rotateFromRefresh).mockReset()
})

describe('POST /api/oauth/token — top-level validation', () => {
  it('returns 400 invalid_request when grant_type missing', async () => {
    const res = await POST(tokenReq({ client_id: 'mcp_abc' }))
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('pragma')).toBe('no-cache')
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
    expect(body.error_description).toMatch(/grant_type/)
  })

  it('returns 400 unsupported_grant_type for unknown grant_type', async () => {
    const res = await POST(tokenReq({ grant_type: 'password' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('unsupported_grant_type')
  })
})

describe('POST /api/oauth/token — authorization_code grant', () => {
  it('happy path: returns 200 with access_token, refresh_token, expires_in, scope', async () => {
    vi.mocked(getClient).mockResolvedValueOnce(fakeClient() as never)
    vi.mocked(consumeCode).mockResolvedValueOnce(fakeCodeRow() as never)
    vi.mocked(issueTokens).mockResolvedValueOnce(fakeTokenRow() as never)

    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        code: 'code_abc',
        code_verifier: VERIFIER,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        client_id: 'mcp_abc',
        resource: 'https://example.com/api/mcp',
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('pragma')).toBe('no-cache')
    const body = await res.json()
    expect(body.token_type).toBe('Bearer')
    expect(body.access_token).toBe('at_freshtoken')
    expect(body.refresh_token).toBe('rt_freshtoken')
    expect(body.expires_in).toBeGreaterThanOrEqual(3598)
    expect(body.expires_in).toBeLessThanOrEqual(3601)
    expect(body.scope).toBe('mcp:read mcp:write')

    const call = vi.mocked(issueTokens).mock.calls[0]
    expect(call[0]).toMatchObject({
      client_id: 'mcp_abc',
      user_id: 'owner-user-id',
      resource: 'https://example.com/api/mcp',
      scopes: ['mcp:read', 'mcp:write'],
    })
  })

  it('returns 400 invalid_client when client_id unknown', async () => {
    vi.mocked(getClient).mockResolvedValueOnce(null)
    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        code: 'code_abc',
        code_verifier: VERIFIER,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        client_id: 'mcp_unknown',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_client')
  })

  it('returns 400 invalid_grant when consumeCode returns null', async () => {
    vi.mocked(getClient).mockResolvedValueOnce(fakeClient() as never)
    vi.mocked(consumeCode).mockResolvedValueOnce(null)
    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        code: 'code_expired',
        code_verifier: VERIFIER,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_grant')
    expect(body.error_description).toMatch(/expired|unknown|used/)
  })

  it('returns 400 invalid_grant when codeRow.client_id !== form client_id', async () => {
    vi.mocked(getClient).mockResolvedValueOnce(fakeClient() as never)
    vi.mocked(consumeCode).mockResolvedValueOnce(
      fakeCodeRow({ client_id: 'mcp_other' }) as never,
    )
    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        code: 'code_abc',
        code_verifier: VERIFIER,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_grant')
    expect(body.error_description).toMatch(/client_id/)
  })

  it('returns 400 invalid_grant when redirect_uri does not match codeRow.redirect_uri', async () => {
    vi.mocked(getClient).mockResolvedValueOnce(fakeClient() as never)
    vi.mocked(consumeCode).mockResolvedValueOnce(fakeCodeRow() as never)
    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        code: 'code_abc',
        code_verifier: VERIFIER,
        redirect_uri: 'https://wrong.example/cb',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_grant')
    expect(body.error_description).toMatch(/redirect_uri/)
  })

  it('returns 400 invalid_grant on PKCE verifier mismatch', async () => {
    vi.mocked(getClient).mockResolvedValueOnce(fakeClient() as never)
    vi.mocked(consumeCode).mockResolvedValueOnce(fakeCodeRow() as never)
    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        code: 'code_abc',
        code_verifier: 'x'.repeat(64),
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_grant')
    expect(body.error_description).toMatch(/PKCE/)
  })

  it('returns 400 invalid_target when resource provided and differs from codeRow.resource', async () => {
    vi.mocked(getClient).mockResolvedValueOnce(fakeClient() as never)
    vi.mocked(consumeCode).mockResolvedValueOnce(fakeCodeRow() as never)
    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        code: 'code_abc',
        code_verifier: VERIFIER,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        client_id: 'mcp_abc',
        resource: 'https://different.example/api/mcp',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_target')
  })

  it('returns 400 invalid_request when required fields are missing', async () => {
    const res = await POST(
      tokenReq({
        grant_type: 'authorization_code',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
  })
})

describe('POST /api/oauth/token — refresh_token grant', () => {
  it('happy path: returns 200 with new tokens', async () => {
    const fresh = fakeTokenRow({
      access_token: 'at_rotated',
      refresh_token: 'rt_rotated',
    })
    vi.mocked(rotateFromRefresh).mockResolvedValueOnce({
      old: fakeTokenRow() as never,
      fresh: fresh as never,
    })
    const res = await POST(
      tokenReq({
        grant_type: 'refresh_token',
        refresh_token: 'rt_old',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body.access_token).toBe('at_rotated')
    expect(body.refresh_token).toBe('rt_rotated')
    expect(body.token_type).toBe('Bearer')
    expect(body.expires_in).toBeGreaterThanOrEqual(3598)
    expect(body.expires_in).toBeLessThanOrEqual(3601)
    expect(body.scope).toBe('mcp:read mcp:write')
  })

  it('returns 400 invalid_grant when rotateFromRefresh returns null', async () => {
    vi.mocked(rotateFromRefresh).mockResolvedValueOnce(null)
    const res = await POST(
      tokenReq({
        grant_type: 'refresh_token',
        refresh_token: 'rt_revoked',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_grant')
  })

  it('returns 400 invalid_grant when rotated token client_id mismatches request client_id', async () => {
    const fresh = fakeTokenRow({ client_id: 'mcp_other' })
    vi.mocked(rotateFromRefresh).mockResolvedValueOnce({
      old: fakeTokenRow() as never,
      fresh: fresh as never,
    })
    const res = await POST(
      tokenReq({
        grant_type: 'refresh_token',
        refresh_token: 'rt_old',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_grant')
    expect(body.error_description).toMatch(/client_id/)
  })

  it('returns 400 invalid_request when refresh_token or client_id missing', async () => {
    const res = await POST(
      tokenReq({
        grant_type: 'refresh_token',
        client_id: 'mcp_abc',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
  })
})

describe('non-POST methods', () => {
  it('GET returns 405 method_not_allowed', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body.error).toBe('method_not_allowed')
  })

  it('PUT returns 405 method_not_allowed', async () => {
    const res = await PUT()
    expect(res.status).toBe(405)
  })

  it('DELETE returns 405 method_not_allowed', async () => {
    const res = await DELETE()
    expect(res.status).toBe(405)
  })
})
