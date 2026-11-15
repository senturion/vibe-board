import { NextResponse } from 'next/server'
import { createClient as createSupabaseSsrClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClient, type ClientRow } from '@/lib/mcp/oauth/clientsStore'
import { createCode } from '@/lib/mcp/oauth/codesStore'
import { getOwnerUserId } from '@/lib/mcp/owner'

const NO_STORE = { 'cache-control': 'no-store' }

// The consent page must never be framed: an invisible frame would let another
// site trick the owner into clicking "Allow".
const CONSENT_HEADERS = {
  ...NO_STORE,
  'content-type': 'text/html; charset=utf-8',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
}

const PARAM_NAMES = [
  'response_type',
  'client_id',
  'redirect_uri',
  'code_challenge',
  'code_challenge_method',
  'state',
  'scope',
  'resource',
] as const

type ParamName = (typeof PARAM_NAMES)[number]
type Params = Record<ParamName, string | null>

function err(status: number, error: string, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: NO_STORE },
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function readParams(get: (name: string) => string | null): Params {
  const out = {} as Params
  for (const name of PARAM_NAMES) out[name] = get(name)
  return out
}

type Validated = {
  client: ClientRow
  userId: string
  supabaseAdmin: ReturnType<typeof createAdminClient>
}

/**
 * Shared checks for showing the consent page (GET) and acting on it (POST).
 * Returns a response when the request must stop, otherwise the verified context.
 */
async function validate(url: URL, p: Params): Promise<NextResponse | Validated> {
  // 1. Required params — JSON 400 (no verified redirect_uri yet)
  const required: ParamName[] = [
    'client_id',
    'redirect_uri',
    'code_challenge',
    'code_challenge_method',
    'response_type',
  ]
  for (const name of required) {
    if (!p[name]) return err(400, 'invalid_request', `missing ${name}`)
  }

  // 2. response_type must be "code"
  if (p.response_type !== 'code') return err(400, 'unsupported_response_type')

  // 3. PKCE method must be S256
  if (p.code_challenge_method !== 'S256') {
    return err(400, 'invalid_request', 'code_challenge_method must be S256')
  }

  // 4. Client lookup
  const supabaseAdmin = createAdminClient()
  const client = await getClient(p.client_id!, { getClient: () => supabaseAdmin })
  if (!client) return err(400, 'invalid_client')

  // 5. redirect_uri must be registered (exact match)
  if (!client.redirect_uris.includes(p.redirect_uri!)) {
    return err(400, 'invalid_request', 'redirect_uri not registered')
  }

  // 6. Session check via SSR Supabase client
  const supabase = await createSupabaseSsrClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 7. No session → bounce to /login with return_to=path+query
  if (!user) {
    const query = new URLSearchParams()
    for (const name of PARAM_NAMES) {
      const value = p[name]
      if (value) query.set(name, value)
    }
    const loginUrl = new URL('/login', url.origin)
    loginUrl.searchParams.set('return_to', `${url.pathname}?${query.toString()}`)
    return NextResponse.redirect(loginUrl, 303)
  }

  // 8. Wrong user → 403 (owner-only)
  if (user.id !== getOwnerUserId()) {
    return err(403, 'access_denied', 'not authorized')
  }

  return { client, userId: user.id, supabaseAdmin }
}

function consentPage(p: Params, client: ClientRow) {
  const redirectHost = new URL(p.redirect_uri!).host
  const clientName = client.client_name?.trim() || 'An unnamed app'
  const hidden = PARAM_NAMES.filter((name) => p[name])
    .map(
      (name) =>
        `<input type="hidden" name="${name}" value="${escapeHtml(p[name]!)}">`,
    )
    .join('\n        ')

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Allow access to Vibe Board?</title>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
        background: #0a0a0a; color: #fafafa; font-family: system-ui, -apple-system, sans-serif; padding: 16px; box-sizing: border-box; }
      main { max-width: 26rem; width: 100%; }
      h1 { font-size: 1.25rem; margin: 0 0 12px; }
      p { color: #aaa; font-size: 0.9rem; line-height: 1.5; margin: 0 0 12px; }
      strong, code { color: #fafafa; }
      code { word-break: break-all; }
      .actions { display: flex; gap: 12px; margin-top: 24px; }
      button { flex: 1; padding: 12px; font-size: 0.9rem; border-radius: 8px; cursor: pointer; }
      .deny { background: transparent; color: #fafafa; border: 1px solid #333; }
      .allow { background: #fafafa; color: #0a0a0a; border: 1px solid #fafafa; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <h1>Allow access to Vibe Board?</h1>
      <p><strong>${escapeHtml(clientName)}</strong> wants to read and change your tasks, notes, todos and habits.</p>
      <p>If you allow this, you will be sent to <code>${escapeHtml(redirectHost)}</code>. Only continue if you started this connection yourself and recognise that address.</p>
      <form method="post" action="/api/oauth/authorize">
        ${hidden}
        <div class="actions">
          <button class="deny" type="submit" name="decision" value="deny">Deny</button>
          <button class="allow" type="submit" name="decision" value="allow">Allow</button>
        </div>
      </form>
    </main>
  </body>
</html>`

  return new NextResponse(html, { status: 200, headers: CONSENT_HEADERS })
}

/** True when the POST was submitted by a page on this same site. */
function isSameOrigin(request: Request, url: URL) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  const hosts = [
    url.host,
    request.headers.get('host'),
    request.headers.get('x-forwarded-host'),
  ]
  return hosts.includes(originHost)
}

// GET never issues a code. It only shows the consent page, so a link or a
// redirect from another site cannot grant access by itself.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = readParams((name) => url.searchParams.get(name))

  const result = await validate(url, params)
  if (result instanceof NextResponse) return result

  return consentPage(params, result.client)
}

export async function POST(request: Request) {
  const url = new URL(request.url)

  if (!isSameOrigin(request, url)) {
    return err(403, 'access_denied', 'cross-site request')
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return err(400, 'invalid_request', 'invalid form body')
  }
  const params = readParams((name) => {
    const value = form.get(name)
    return typeof value === 'string' && value ? value : null
  })

  const result = await validate(url, params)
  if (result instanceof NextResponse) return result

  const redirectBack = new URL(params.redirect_uri!)

  if (form.get('decision') !== 'allow') {
    redirectBack.searchParams.set('error', 'access_denied')
    if (params.state) redirectBack.searchParams.set('state', params.state)
    return NextResponse.redirect(redirectBack, 303)
  }

  const codeRow = await createCode(
    {
      client_id: params.client_id!,
      user_id: result.userId,
      redirect_uri: params.redirect_uri!,
      code_challenge: params.code_challenge!,
      code_challenge_method: 'S256',
      resource: params.resource ?? null,
      scopes: params.scope ? params.scope.split(/\s+/).filter(Boolean) : null,
    },
    { getClient: () => result.supabaseAdmin },
  )

  redirectBack.searchParams.set('code', codeRow.code)
  if (params.state) redirectBack.searchParams.set('state', params.state)
  return NextResponse.redirect(redirectBack, 303)
}

export async function PUT() {
  return err(405, 'method_not_allowed')
}

export async function DELETE() {
  return err(405, 'method_not_allowed')
}
