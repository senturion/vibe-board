import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { randomToken } from './random'

export type StoreDeps = { getClient: () => SupabaseClient<Database> }

export type IssueInput = {
  client_id: string
  user_id: string
  resource?: string | null
  scopes?: string[] | null
  accessTtlSeconds?: number
  refreshTtlSeconds?: number
}

export type TokenRow = Database['public']['Tables']['mcp_oauth_tokens']['Row']

const DEFAULT_ACCESS_TTL = 60 * 60 // 1h
const DEFAULT_REFRESH_TTL = 60 * 60 * 24 * 30 // 30d

export async function issueTokens(
  input: IssueInput,
  deps: StoreDeps,
): Promise<TokenRow> {
  const accessTtl = input.accessTtlSeconds ?? DEFAULT_ACCESS_TTL
  const refreshTtl = input.refreshTtlSeconds ?? DEFAULT_REFRESH_TTL
  const now = Date.now()
  const row = {
    access_token: 'at_' + randomToken(),
    refresh_token: 'rt_' + randomToken(),
    client_id: input.client_id,
    user_id: input.user_id,
    resource: input.resource ?? null,
    scopes: input.scopes ?? null,
    expires_at: new Date(now + accessTtl * 1000).toISOString(),
    refresh_expires_at: new Date(now + refreshTtl * 1000).toISOString(),
    revoked_at: null,
  }

  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('mcp_oauth_tokens')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as TokenRow
}

export async function findByAccessToken(
  accessToken: string,
  deps: StoreDeps,
): Promise<TokenRow | null> {
  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('mcp_oauth_tokens')
    .select('*')
    .eq('access_token', accessToken)
    .maybeSingle()
  if (error) throw error
  return (data as TokenRow | null) ?? null
}

export async function findByRefreshToken(
  refreshToken: string,
  deps: StoreDeps,
): Promise<TokenRow | null> {
  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('mcp_oauth_tokens')
    .select('*')
    .eq('refresh_token', refreshToken)
    .maybeSingle()
  if (error) throw error
  return (data as TokenRow | null) ?? null
}

export async function revoke(
  accessToken: string,
  deps: StoreDeps,
): Promise<void> {
  const now = new Date().toISOString()
  const supabase = deps.getClient()
  const { error } = await supabase
    .from('mcp_oauth_tokens')
    .update({ revoked_at: now })
    .eq('access_token', accessToken)
  if (error) throw error
}

/**
 * Refresh-token rotation. Atomically revokes the existing row (single
 * conditional UPDATE filtered on `revoked_at IS NULL`) before issuing a new
 * pair, so two concurrent rotations cannot both succeed — only one wins the
 * filter, the other sees a no-op update and returns null.
 */
export async function rotateFromRefresh(
  refreshToken: string,
  deps: StoreDeps,
): Promise<{ old: TokenRow; fresh: TokenRow } | null> {
  const supabase = deps.getClient()
  const existing = await findByRefreshToken(refreshToken, deps)
  if (!existing) return null
  if (existing.revoked_at) return null
  if (existing.refresh_expires_at) {
    if (Date.parse(existing.refresh_expires_at) <= Date.now()) return null
  }

  const now = new Date().toISOString()
  const { data: revoked, error: revokeErr } = await supabase
    .from('mcp_oauth_tokens')
    .update({ revoked_at: now })
    .eq('access_token', existing.access_token)
    .is('revoked_at', null)
    .select()
    .maybeSingle()
  if (revokeErr) throw revokeErr
  if (!revoked) return null

  const fresh = await issueTokens(
    {
      client_id: existing.client_id,
      user_id: existing.user_id,
      resource: existing.resource ?? null,
      scopes: existing.scopes ?? null,
    },
    deps,
  )

  return { old: revoked as TokenRow, fresh }
}
