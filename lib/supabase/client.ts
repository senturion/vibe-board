import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'
import { isNative } from '../platform'
import { capacitorStorage } from './native-storage'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let client: SupabaseClient | null = null

/** Thrown when required Supabase env vars are missing at build/runtime. */
export class SupabaseConfigError extends Error {
  constructor() {
    super(
      'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.'
    )
    this.name = 'SupabaseConfigError'
  }
}

export function createClient(): SupabaseClient {
  if (client) {
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseConfigError()
  }

  // Use native storage in Capacitor apps
  const options = isNative() ? {
    auth: {
      storage: capacitorStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disable for native apps
    },
  } : {}

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, options)

  return client
}
