import { timingSafeEqual } from 'node:crypto'

export function isAuthorized(request: Request): boolean {
  const expected = process.env.MCP_BEARER_TOKEN
  if (!expected) return false

  const header = request.headers.get('authorization')
  if (!header) return false

  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return false

  const provided = header.slice(prefix.length)
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
