import { NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/mcp/auth'
import { mcpHandler } from '@/lib/mcp/server'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Bearer-token auth guard at the route boundary — no unauthenticated request
// reaches the MCP handler.
async function guarded(request: Request) {
  if (!isAuthorized(request)) return unauthorized()
  return mcpHandler(request)
}

export const GET = guarded
export const POST = guarded
export const DELETE = guarded
