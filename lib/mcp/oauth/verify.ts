import type { TokenRow } from './tokensStore'

export type AuthInfo = {
  user_id: string
  client_id: string
  scopes: string[]
  resource: string | null
}

export async function verifyAccessToken(
  rawToken: string,
  expectedResource: string,
  deps: { findByAccessToken: (t: string) => Promise<TokenRow | null> },
): Promise<AuthInfo | null> {
  if (!rawToken) return null
  const row = await deps.findByAccessToken(rawToken)
  if (!row) return null
  if (row.revoked_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  // resource binding: if row.resource is set, it MUST match. If null, allow (legacy/no-binding).
  if (row.resource && row.resource !== expectedResource) return null
  return {
    user_id: row.user_id,
    client_id: row.client_id,
    scopes: row.scopes ?? [],
    resource: row.resource,
  }
}
