import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/**
 * Every table that holds the user's own data. Push subscriptions and OAuth
 * tables are left out: they are device or connection credentials, not content.
 */
export const EXPORT_TABLES = [
  'boards',
  'tasks',
  'task_tags',
  'tags',
  'tag_categories',
  'todos',
  'notes',
  'habit_categories',
  'habits',
  'habit_completions',
  'habit_streaks',
  'goal_categories',
  'goals',
  'milestones',
  'goal_task_links',
  'routines',
  'routine_items',
  'routine_completions',
  'routine_item_completions',
  'journal_prompts',
  'journal_entries',
  'focus_settings',
  'focus_sessions',
  'work_locations',
  'dashboard_widgets',
  'notification_settings',
  'user_settings',
  'user_ui_state',
] as const satisfies ReadonlyArray<keyof Database['public']['Tables']>

export type ExportTable = (typeof EXPORT_TABLES)[number]

export interface ExportFile {
  version: '2.0'
  exportedAt: string
  /** Row counts per table, so a backup can be sanity-checked at a glance. */
  counts: Record<string, number>
  data: Record<string, unknown[]>
}

// Supabase returns at most 1000 rows per request, so read in pages.
const PAGE_SIZE = 1000

async function fetchAllRows(
  supabase: SupabaseClient<Database>,
  table: ExportTable,
): Promise<unknown[]> {
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Could not read ${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

/**
 * Reads all of the signed-in user's data. Row-level security limits every
 * query to their own rows. Fails as a whole if any table cannot be read, so a
 * partial backup is never mistaken for a complete one.
 */
export async function buildExport(supabase: SupabaseClient<Database>): Promise<ExportFile> {
  const results = await Promise.all(
    EXPORT_TABLES.map(async (table) => [table, await fetchAllRows(supabase, table)] as const),
  )

  const data: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}
  for (const [table, rows] of results) {
    data[table] = rows
    counts[table] = rows.length
  }

  return { version: '2.0', exportedAt: new Date().toISOString(), counts, data }
}
