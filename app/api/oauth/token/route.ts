import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClient } from '@/lib/mcp/oauth/clientsStore'
import { consumeCode } from '@/lib/mcp/oauth/codesStore'
import { issueTokens, rotateFromRefresh } from '@/lib/mcp/oauth/tokensStore'
import { verifyPkceS256 } from '@/lib/mcp/oauth/pkce'

const NO_STORE = { 'cache-control': 'no-store', 'pragma': 'no-cache' }

function err(status: number, error: string, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: NO_STORE },
  )
}

type TokenRowLike = {
  access_token: string
  refresh_token: string | null
  expires_at: string
  scopes: string[] | null
}

function tokenResponse(row: TokenRowLike) {
  const now = Date.now()
  const expiresIn = Math.max(
    1,
    Math.round((new Date(row.expires_at).getTime() - now) / 1000),
  )
  const body: Record<string, unknown> = {
    access_token: row.access_token,
    token_type: 'Bearer',
    expires_in: expiresIn,
  }
  if (row.refresh_token) body.refresh_token = row.refresh_token
  if (row.scopes && row.scopes.length) body.scope = row.scopes.join(' ')
  return NextResponse.json(body, { status: 200, headers: NO_STORE })
}

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return err(400, 'invalid_request', 'invalid form body')
  }

  const grantType = form.get('grant_type')?.toString()
  if (!grantType) return err(400, 'invalid_request', 'missing grant_type')

  const supabase = createAdminClient()
  const deps = { getClient: () => supabase }

  if (grantType === 'authorization_code') {
    const code = form.get('code')?.toString()
    const codeVerifier = form.get('code_verifier')?.toString()
    const redirectUri = form.get('redirect_uri')?.toString()
    const clientId = form.get('client_id')?.toString()
    const resource = form.get('resource')?.toString()

    if (!code || !codeVerifier || !redirectUri || !clientId) {
      return err(400, 'invalid_request', 'missing required parameter')
    }

    const client = await getClient(clientId, deps)
    if (!client) return err(400, 'invalid_client')

    const codeRow = await consumeCode(code, deps)
    if (!codeRow) {
      return err(
        400,
        'invalid_grant',
        'code is expired, unknown, or already used',
      )
    }

    if (codeRow.client_id !== clientId) {
      return err(400, 'invalid_grant', 'client_id mismatch')
    }
    if (codeRow.redirect_uri !== redirectUri) {
      return err(400, 'invalid_grant', 'redirect_uri mismatch')
    }
    if (!verifyPkceS256(codeVerifier, codeRow.code_challenge)) {
      return err(400, 'invalid_grant', 'PKCE verification failed')
    }

    if (resource && codeRow.resource && resource !== codeRow.resource) {
      return err(400, 'invalid_target', 'resource mismatch')
    }

    const tokens = await issueTokens(
      {
        client_id: clientId,
        user_id: codeRow.user_id,
        resource: codeRow.resource,
        scopes: codeRow.scopes,
      },
      deps,
    )
    return tokenResponse(tokens)
  }

  if (grantType === 'refresh_token') {
    const refreshToken = form.get('refresh_token')?.toString()
    const clientId = form.get('client_id')?.toString()
    if (!refreshToken || !clientId) {
      return err(400, 'invalid_request', 'missing required parameter')
    }

    const result = await rotateFromRefresh(refreshToken, deps)
    if (!result) {
      return err(
        400,
        'invalid_grant',
        'refresh token invalid, expired, or revoked',
      )
    }

    if (result.fresh.client_id !== clientId) {
      return err(400, 'invalid_grant', 'client_id mismatch')
    }

    return tokenResponse(result.fresh)
  }

  return err(400, 'unsupported_grant_type')
}

export async function GET() {
  return err(405, 'method_not_allowed')
}

export async function PUT() {
  return err(405, 'method_not_allowed')
}

export async function DELETE() {
  return err(405, 'method_not_allowed')
}
