import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mcpHandler } from '@/lib/mcp/server'
import { verifyAccessToken } from '@/lib/mcp/oauth/verify'
import { findByAccessToken } from '@/lib/mcp/oauth/tokensStore'

function originOf(r: Request): string {
  const u = new URL(r.url)
  return `${u.protocol}//${u.host}`
}

function unauthorized(resourceMetadataUrl: string) {
  return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: {
      'content-type': 'application/json',
      'www-authenticate': `Bearer resource_metadata="${resourceMetadataUrl}"`,
    },
  })
}

async function guarded(request: Request) {
  const origin = originOf(request)
  const expectedResource = `${origin}/api/mcp`
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource`

  const header = request.headers.get('authorization')
  if (!header || !header.startsWith('Bearer ')) return unauthorized(metadataUrl)
  const token = header.slice(7)

  const supabase = createAdminClient()
  const auth = await verifyAccessToken(token, expectedResource, {
    findByAccessToken: (t) => findByAccessToken(t, { getClient: () => supabase }),
  })
  if (!auth) return unauthorized(metadataUrl)

  return mcpHandler(request)
}

export const GET = guarded
export const POST = guarded
export const DELETE = guarded
