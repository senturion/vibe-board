import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'
import { isNative } from '../platform'
import { capacitorStorage } from './native-storage'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (client) {
    return client
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

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  )

  return client
}
