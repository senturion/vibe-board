import { NextResponse } from 'next/server'
import { createClient as createSupabaseSsrClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClient } from '@/lib/mcp/oauth/clientsStore'
import { createCode } from '@/lib/mcp/oauth/codesStore'
import { getOwnerUserId } from '@/lib/mcp/owner'

const NO_STORE = { 'cache-control': 'no-store' }

function err(status: number, error: string, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: NO_STORE },
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams

  const responseType = q.get('response_type')
  const clientId = q.get('client_id')
  const redirectUri = q.get('redirect_uri')
  const codeChallenge = q.get('code_challenge')
  const ccm = q.get('code_challenge_method')

  // 1. Required params — JSON 400 (no verified redirect_uri yet)
  const required = [
    ['client_id', clientId],
    ['redirect_uri', redirectUri],
    ['code_challenge', codeChallenge],
    ['code_challenge_method', ccm],
    ['response_type', responseType],
  ] as const
  for (const [name, value] of required) {
    if (!value) return err(400, 'invalid_request', `missing ${name}`)
  }

  // 2. response_type must be "code"
  if (responseType !== 'code') return err(400, 'unsupported_response_type')

  // 3. PKCE method must be S256
  if (ccm !== 'S256') {
    return err(400, 'invalid_request', 'code_challenge_method must be S256')
  }

  // 4. Client lookup
  const supabaseAdmin = createAdminClient()
  const client = await getClient(clientId!, { getClient: () => supabaseAdmin })
  if (!client) return err(400, 'invalid_client')

  // 5. redirect_uri must be registered
  if (!client.redirect_uris.includes(redirectUri!)) {
    return err(400, 'invalid_request', 'redirect_uri not registered')
  }

  // 6. Session check via SSR Supabase client
  const supabase = await createSupabaseSsrClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 7. No session → bounce to /login with return_to=path+query
  if (!user) {
    const returnTo = url.pathname + url.search
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('return_to', returnTo)
    return NextResponse.redirect(loginUrl)
  }

  // 8. Wrong user → 403 (no consent UI; owner-only)
  if (user.id !== getOwnerUserId()) {
    return err(403, 'access_denied', 'not authorized')
  }

  // 9. Auto-approve → mint code, redirect back
  const state = q.get('state')
  const scope = q.get('scope')
  const resource = q.get('resource')

  const codeRow = await createCode(
    {
      client_id: clientId!,
      user_id: user.id,
      redirect_uri: redirectUri!,
      code_challenge: codeChallenge!,
      code_challenge_method: 'S256',
      resource: resource ?? null,
      scopes: scope ? scope.split(/\s+/).filter(Boolean) : null,
    },
    { getClient: () => supabaseAdmin },
  )

  const redirectBack = new URL(redirectUri!)
  redirectBack.searchParams.set('code', codeRow.code)
  if (state) redirectBack.searchParams.set('state', state)
  return NextResponse.redirect(redirectBack)
}

export async function POST() {
  return err(405, 'method_not_allowed')
}

export async function PUT() {
  return err(405, 'method_not_allowed')
}

export async function DELETE() {
  return err(405, 'method_not_allowed')
}
