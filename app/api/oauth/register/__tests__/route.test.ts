import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({})) }))
vi.mock('@/lib/mcp/oauth/clientsStore', () => ({ registerClient: vi.fn() }))

import { POST, GET, PUT, DELETE } from '../route'
import { registerClient } from '@/lib/mcp/oauth/clientsStore'

beforeEach(() => {
  vi.mocked(registerClient).mockReset()
})

function postReq(body: unknown): Request {
  return new Request('https://example.com/api/oauth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/oauth/register', () => {
  it('returns 201 with the inserted row on success', async () => {
    const fakeRow = {
      client_id: 'mcp_abc',
      client_name: 'Claude',
      redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      client_secret_hash: null,
      created_at: '2026-05-21T00:00:00.000Z',
    }
    vi.mocked(registerClient).mockResolvedValueOnce(fakeRow as never)

    const res = await POST(
      postReq({
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        client_name: 'Claude',
      }),
    )

    expect(res.status).toBe(201)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body).toEqual(fakeRow)

    // confirms input forwarded to store
    const call = vi.mocked(registerClient).mock.calls[0]
    expect(call[0].redirect_uris).toEqual(['https://claude.ai/api/mcp/auth_callback'])
    expect(call[0].client_name).toBe('Claude')
  })

  it('returns 400 invalid_redirect_uri when redirect_uris missing/empty', async () => {
    const res = await POST(postReq({ redirect_uris: [] }))
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body.error).toBe('invalid_redirect_uri')
    expect(body.error_description).toMatch(/non-empty/)

    const res2 = await POST(postReq({}))
    expect(res2.status).toBe(400)
    expect((await res2.json()).error).toBe('invalid_redirect_uri')
  })

  it('returns 400 invalid_redirect_uri for non-https uri (description names offender)', async () => {
    const res = await POST(
      postReq({ redirect_uris: ['http://evil.example.com/cb'] }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_redirect_uri')
    expect(body.error_description).toContain('http://evil.example.com/cb')
  })

  it('allows http loopback redirect_uris (RFC 8252 — localhost, 127.0.0.1, [::1])', async () => {
    vi.mocked(registerClient).mockResolvedValueOnce({
      client_id: 'mcp_x',
      client_name: 'cli',
      redirect_uris: ['http://localhost:3000/cb', 'http://127.0.0.1:8080/cb', 'http://[::1]:9000/cb'],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
      client_secret_hash: null,
      created_at: new Date().toISOString(),
    })
    const res = await POST(
      postReq({
        client_name: 'cli',
        redirect_uris: ['http://localhost:3000/cb', 'http://127.0.0.1:8080/cb', 'http://[::1]:9000/cb'],
      }),
    )
    expect(res.status).toBe(201)
  })

  it('returns 400 invalid_client_metadata for malformed JSON', async () => {
    const res = await POST(postReq('this is not json'))
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = await res.json()
    expect(body.error).toBe('invalid_client_metadata')
    expect(body.error_description).toMatch(/json/i)
  })

  it('returns 400 invalid_client_metadata for unsupported token_endpoint_auth_method', async () => {
    const res = await POST(
      postReq({
        redirect_uris: ['https://claude.ai/cb'],
        token_endpoint_auth_method: 'private_key_jwt',
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_client_metadata')
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

  it('PUT and DELETE return 405 method_not_allowed', async () => {
    const putRes = await PUT()
    expect(putRes.status).toBe(405)
    expect((await putRes.json()).error).toBe('method_not_allowed')

    const delRes = await DELETE()
    expect(delRes.status).toBe(405)
    expect((await delRes.json()).error).toBe('method_not_allowed')
  })
})
