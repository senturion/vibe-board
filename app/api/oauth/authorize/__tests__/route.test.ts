import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
}))
vi.mock('@/lib/mcp/oauth/clientsStore', () => ({
  getClient: vi.fn(),
}))
vi.mock('@/lib/mcp/oauth/codesStore', () => ({
  createCode: vi.fn(),
}))
vi.mock('@/lib/mcp/owner', () => ({
  getOwnerUserId: vi.fn(),
}))

import { GET, POST } from '../route'
import { createClient } from '@/lib/supabase/server'
import { getClient } from '@/lib/mcp/oauth/clientsStore'
import { createCode } from '@/lib/mcp/oauth/codesStore'
import { getOwnerUserId } from '@/lib/mcp/owner'

type GetUserResult = { data: { user: { id: string } | null } }

function mockSession(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValueOnce({
    auth: {
      getUser: vi.fn(async (): Promise<GetUserResult> => ({ data: { user } })),
    },
  } as never)
}

function mockClient(redirectUris: string[] | null) {
  if (redirectUris === null) {
    vi.mocked(getClient).mockResolvedValueOnce(null)
  } else {
    vi.mocked(getClient).mockResolvedValueOnce({
      client_id: 'mcp_abc',
      client_name: 'Claude',
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      client_secret_hash: null,
      created_at: '2026-05-21T00:00:00.000Z',
    } as never)
  }
}

function authReq(params: Record<string, string | undefined>): Request {
  const url = new URL('https://example.com/api/oauth/authorize')
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v)
  }
  return new Request(url.toString())
}

function consentPost(
  fields: Record<string, string | undefined>,
  headers: Record<string, string> = { origin: 'https://example.com' },
): Request {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) body.set(k, v)
  }
  return new Request('https://example.com/api/oauth/authorize', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: body.toString(),
  })
}

const validParams = {
  response_type: 'code',
  client_id: 'mcp_abc',
  redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
  code_challenge: 'abc123challenge',
  code_challenge_method: 'S256',
  state: 'xyz-state',
  scope: 'mcp:read mcp:write',
  resource: 'https://example.com/api/mcp',
}

beforeEach(() => {
  vi.mocked(createClient).mockReset()
  vi.mocked(getClient).mockReset()
  vi.mocked(createCode).mockReset()
  vi.mocked(getOwnerUserId).mockReset()
  vi.mocked(getOwnerUserId).mockReturnValue('owner-user-id')
})

describe('GET /api/oauth/authorize — validation errors', () => {
  it('returns 400 invalid_request when response_type missing', async () => {
    const res = await GET(authReq({ ...validParams, response_type: undefined }))
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
    expect(body.error_description).toMatch(/response_type/)
  })

  it('returns 400 invalid_request when client_id missing', async () => {
    const res = await GET(authReq({ ...validParams, client_id: undefined }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
    expect(body.error_description).toMatch(/client_id/)
  })

  it('returns 400 unsupported_response_type when response_type is not "code"', async () => {
    const res = await GET(authReq({ ...validParams, response_type: 'token' }))
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body.error).toBe('unsupported_response_type')
  })

  it('returns 400 invalid_request when code_challenge_method is not "S256"', async () => {
    const res = await GET(
      authReq({ ...validParams, code_challenge_method: 'plain' }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
    expect(body.error_description).toMatch(/S256/)
  })

  it('returns 400 invalid_client when client_id unknown', async () => {
    mockClient(null)
    const res = await GET(authReq(validParams))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_client')
  })

  it('returns 400 invalid_request when redirect_uri not in client.redirect_uris', async () => {
    mockClient(['https://different.example/cb'])
    const res = await GET(authReq(validParams))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_request')
    expect(body.error_description).toBe('redirect_uri not registered')
  })
})

describe('GET /api/oauth/authorize — session handling', () => {
  it('redirects to /login?return_to=<encoded authorize URL> when no session', async () => {
    mockClient([validParams.redirect_uri])
    mockSession(null)

    const res = await GET(authReq(validParams))
    expect(res.status).toBe(303)
    const loc = res.headers.get('location')
    expect(loc).toBeTruthy()
    expect(loc!).toContain('/login?return_to=')
    // return_to should be encoded path+query that includes client_id
    expect(loc!).toContain(encodeURIComponent('/api/oauth/authorize?'))
    expect(loc!).toContain(encodeURIComponent('client_id=mcp_abc'))
  })

  it('returns 403 access_denied when signed-in user is not the owner', async () => {
    mockClient([validParams.redirect_uri])
    mockSession({ id: 'some-other-user' })

    const res = await GET(authReq(validParams))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('access_denied')
    expect(body.error_description).toBe('not authorized')
  })
})

describe('GET /api/oauth/authorize — consent page', () => {
  it('shows a consent page and never mints a code', async () => {
    mockClient([validParams.redirect_uri])
    mockSession({ id: 'owner-user-id' })

    const res = await GET(authReq(validParams))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/html/)
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('content-security-policy')).toMatch(/frame-ancestors 'none'/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('location')).toBeNull()

    const html = await res.text()
    expect(html).toContain('Claude')
    expect(html).toContain('claude.ai')
    expect(html).toContain('name="state" value="xyz-state"')
    expect(createCode).not.toHaveBeenCalled()
  })

  it('escapes the client name', async () => {
    vi.mocked(getClient).mockResolvedValueOnce({
      client_id: 'mcp_abc',
      client_name: '<script>alert(1)</script>',
      redirect_uris: [validParams.redirect_uri],
    } as never)
    mockSession({ id: 'owner-user-id' })

    const html = await (await GET(authReq(validParams))).text()
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('POST /api/oauth/authorize — consent decision', () => {
  it('redirects to redirect_uri with code + state when allowed', async () => {
    mockClient([validParams.redirect_uri])
    mockSession({ id: 'owner-user-id' })
    vi.mocked(createCode).mockResolvedValueOnce({
      code: 'code_minted123',
    } as never)

    const res = await POST(consentPost({ ...validParams, decision: 'allow' }))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(
      'https://claude.ai/api/mcp/auth_callback?code=code_minted123&state=xyz-state',
    )

    const call = vi.mocked(createCode).mock.calls[0]
    expect(call[0]).toMatchObject({
      client_id: 'mcp_abc',
      user_id: 'owner-user-id',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'abc123challenge',
      code_challenge_method: 'S256',
      resource: 'https://example.com/api/mcp',
      scopes: ['mcp:read', 'mcp:write'],
    })
  })

  it('redirects without state param when none was provided', async () => {
    mockClient([validParams.redirect_uri])
    mockSession({ id: 'owner-user-id' })
    vi.mocked(createCode).mockResolvedValueOnce({
      code: 'code_nostate',
    } as never)

    const res = await POST(
      consentPost({ ...validParams, state: undefined, decision: 'allow' }),
    )
    expect(res.headers.get('location')).toBe(
      'https://claude.ai/api/mcp/auth_callback?code=code_nostate',
    )
  })

  it('redirects with error=access_denied and no code when denied', async () => {
    mockClient([validParams.redirect_uri])
    mockSession({ id: 'owner-user-id' })

    const res = await POST(consentPost({ ...validParams, decision: 'deny' }))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(
      'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz-state',
    )
    expect(createCode).not.toHaveBeenCalled()
  })

  it('rejects a cross-site POST', async () => {
    const res = await POST(
      consentPost({ ...validParams, decision: 'allow' }, { origin: 'https://evil.example' }),
    )
    expect(res.status).toBe(403)
    expect(createCode).not.toHaveBeenCalled()
  })

  it('rejects a POST with no Origin header', async () => {
    const res = await POST(consentPost({ ...validParams, decision: 'allow' }, {}))
    expect(res.status).toBe(403)
    expect(createCode).not.toHaveBeenCalled()
  })

  it('returns 403 when the signed-in user is not the owner', async () => {
    mockClient([validParams.redirect_uri])
    mockSession({ id: 'some-other-user' })

    const res = await POST(consentPost({ ...validParams, decision: 'allow' }))
    expect(res.status).toBe(403)
    expect(createCode).not.toHaveBeenCalled()
  })

  it('returns 400 when redirect_uri is not registered', async () => {
    mockClient(['https://different.example/cb'])

    const res = await POST(consentPost({ ...validParams, decision: 'allow' }))
    expect(res.status).toBe(400)
    expect(createCode).not.toHaveBeenCalled()
  })
})
