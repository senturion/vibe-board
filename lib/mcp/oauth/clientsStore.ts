import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { randomToken } from './random'

export type StoreDeps = { getClient: () => SupabaseClient<Database> }

export type RegisterInput = {
  client_name?: string
  redirect_uris: string[]
  token_endpoint_auth_method?: 'none' | 'client_secret_basic' | 'client_secret_post'
  grant_types?: string[]
}

export type ClientRow = Database['public']['Tables']['mcp_oauth_clients']['Row']

export async function registerClient(
  input: RegisterInput,
  deps: StoreDeps,
): Promise<ClientRow> {
  if (!Array.isArray(input.redirect_uris) || input.redirect_uris.length === 0) {
    throw new Error('redirect_uris must be a non-empty array of strings')
  }

  const row = {
    client_id: 'mcp_' + randomToken(),
    client_name: input.client_name ?? null,
    redirect_uris: input.redirect_uris,
    token_endpoint_auth_method: input.token_endpoint_auth_method ?? 'none',
    grant_types: input.grant_types ?? ['authorization_code', 'refresh_token'],
  }

  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('mcp_oauth_clients')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as ClientRow
}

export async function getClient(
  clientId: string,
  deps: StoreDeps,
): Promise<ClientRow | null> {
  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('mcp_oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) throw error
  return (data as ClientRow | null) ?? null
}
