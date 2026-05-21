import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { randomToken } from './random'

export type StoreDeps = { getClient: () => SupabaseClient<Database> }

export type CreateCodeInput = {
  client_id: string
  user_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method?: 'S256'
  resource?: string | null
  scopes?: string[] | null
  ttlSeconds?: number
}

export type CodeRow = Database['public']['Tables']['mcp_oauth_codes']['Row']

export async function createCode(
  input: CreateCodeInput,
  deps: StoreDeps,
): Promise<CodeRow> {
  const ttl = input.ttlSeconds ?? 300
  const row = {
    code: 'code_' + randomToken(),
    client_id: input.client_id,
    user_id: input.user_id,
    redirect_uri: input.redirect_uri,
    code_challenge: input.code_challenge,
    code_challenge_method: input.code_challenge_method ?? 'S256',
    resource: input.resource ?? null,
    scopes: input.scopes ?? null,
    consumed_at: null,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  }

  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('mcp_oauth_codes')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as CodeRow
}

/**
 * Atomic single-use redemption. Returns the row only when the code exists,
 * has not been consumed, and has not expired. The single conditional UPDATE
 * avoids the race where two concurrent callers could both observe an
 * unconsumed row in a separate SELECT.
 */
export async function consumeCode(
  code: string,
  deps: StoreDeps,
): Promise<CodeRow | null> {
  const now = new Date().toISOString()
  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('mcp_oauth_codes')
    .update({ consumed_at: now })
    .eq('code', code)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .select()
    .maybeSingle()
  if (error) throw error
  return (data as CodeRow | null) ?? null
}
