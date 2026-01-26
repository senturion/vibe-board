import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (client) {
    return client
  }

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
