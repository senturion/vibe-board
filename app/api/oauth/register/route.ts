import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { registerClient } from '@/lib/mcp/oauth/clientsStore'

type Body = {
  redirect_uris?: unknown
  client_name?: unknown
  token_endpoint_auth_method?: unknown
  grant_types?: unknown
}

const NO_STORE = { 'cache-control': 'no-store' }

function err(status: number, error: string, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: NO_STORE },
  )
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return err(400, 'invalid_client_metadata', 'body must be valid JSON')
  }

  const uris = body.redirect_uris
  if (!Array.isArray(uris) || uris.length === 0) {
    return err(400, 'invalid_redirect_uri', 'redirect_uris must be a non-empty array')
  }
  for (const u of uris) {
    if (typeof u !== 'string') {
      return err(400, 'invalid_redirect_uri', 'each redirect_uri must be a string')
    }
    if (!u.startsWith('https://')) {
      return err(400, 'invalid_redirect_uri', `non-https redirect_uri: ${u}`)
    }
  }

  const tokenAuth = body.token_endpoint_auth_method
  if (
    tokenAuth !== undefined &&
    tokenAuth !== 'none' &&
    tokenAuth !== 'client_secret_basic' &&
    tokenAuth !== 'client_secret_post'
  ) {
    return err(400, 'invalid_client_metadata', 'unsupported token_endpoint_auth_method')
  }

  const row = await registerClient(
    {
      redirect_uris: uris as string[],
      client_name: typeof body.client_name === 'string' ? body.client_name : undefined,
      token_endpoint_auth_method: tokenAuth as
        | 'none'
        | 'client_secret_basic'
        | 'client_secret_post'
        | undefined,
      grant_types: Array.isArray(body.grant_types) ? (body.grant_types as string[]) : undefined,
    },
    { getClient: () => createAdminClient() },
  )

  return NextResponse.json(row, { status: 201, headers: NO_STORE })
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
