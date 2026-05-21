import { NextResponse } from 'next/server'
import { buildAuthorizationServerMetadata } from '@/lib/mcp/oauth/metadata'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

function originOf(request: Request): string {
  const u = new URL(request.url)
  return `${u.protocol}//${u.host}`
}

export async function GET(request: Request) {
  return NextResponse.json(buildAuthorizationServerMetadata(originOf(request)), { headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
