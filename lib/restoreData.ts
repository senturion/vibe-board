import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { EXPORT_TABLES, type ExportFile, type ExportTable } from '@/lib/exportData'

/**
 * Tables in the order they must be written, parents before the rows that
 * point at them (boards before tasks, habits before completions, ...).
 */
export const RESTORE_ORDER: ExportTable[] = [
  'boards',
  'tasks',
  'tag_categories',
  'tags',
  'task_tags',
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
]

/**
 * How each table recognises "the same row". Most use their id. Tables with
 * one row per user, or a natural key such as one journal entry per day, use
 * that key instead, and their id is left out so an existing row keeps its own.
 */
const CONFLICT_KEYS: Partial<Record<ExportTable, { onConflict: string; dropId?: boolean }>> = {
  task_tags: { onConflict: 'task_id,tag_id' },
  habit_streaks: { onConflict: 'user_id,habit_id', dropId: true },
  goal_task_links: { onConflict: 'goal_id,task_id', dropId: true },
  routine_completions: { onConflict: 'user_id,routine_id,completion_date', dropId: true },
  routine_item_completions: { onConflict: 'user_id,routine_item_id,completion_date', dropId: true },
  journal_entries: { onConflict: 'user_id,entry_date', dropId: true },
  work_locations: { onConflict: 'user_id,date', dropId: true },
  focus_settings: { onConflict: 'user_id' },
  notification_settings: { onConflict: 'user_id' },
  user_settings: { onConflict: 'user_id' },
  user_ui_state: { onConflict: 'user_id' },
}

/** Tables without a user_id column. */
const NO_USER_ID = new Set<ExportTable>(['task_tags'])

const BATCH_SIZE = 500

export class BackupFormatError extends Error {}

/** Checks a parsed file is a Vibe Board backup this app can restore. */
export function parseBackup(value: unknown): ExportFile {
  const file = value as Partial<ExportFile> | null
  if (!file || typeof file !== 'object' || !file.data || typeof file.data !== 'object') {
    throw new BackupFormatError('This is not a Vibe Board backup file.')
  }
  if (file.version !== '2.0') {
    throw new BackupFormatError(
      file.version === '1.0'
        ? 'This backup is from an older version of the app that did not save your data. It cannot be restored.'
        : `Unsupported backup version: ${String(file.version)}.`,
    )
  }
  for (const [table, rows] of Object.entries(file.data)) {
    if (!Array.isArray(rows)) throw new BackupFormatError(`The ${table} section of the backup is damaged.`)
  }
  return file as ExportFile
}

/** Number of rows per table the restore would write, for the confirmation step. */
export function backupCounts(file: ExportFile): { table: ExportTable; rows: number }[] {
  return RESTORE_ORDER.map(table => ({ table, rows: file.data[table]?.length ?? 0 })).filter(t => t.rows > 0)
}

/**
 * Writes a backup into the signed-in user's account. It merges: rows that
 * already exist are overwritten with the backup's version, new rows are
 * added, and nothing is deleted. Every row is assigned to `userId`, so a
 * backup can only ever write into the account doing the restore.
 * Stops at the first table that fails and says which.
 */
export async function restoreBackup(
  supabase: SupabaseClient<Database>,
  file: ExportFile,
  userId: string,
  onProgress?: (table: ExportTable) => void,
): Promise<{ table: ExportTable; rows: number }[]> {
  const written: { table: ExportTable; rows: number }[] = []
  const known = new Set<string>(EXPORT_TABLES)

  for (const table of RESTORE_ORDER) {
    if (!known.has(table)) continue
    const rows = (file.data[table] ?? []) as Record<string, unknown>[]
    if (rows.length === 0) continue
    onProgress?.(table)

    const key = CONFLICT_KEYS[table]
    const prepared = rows.map(row => {
      const copy: Record<string, unknown> = { ...row }
      if (!NO_USER_ID.has(table)) copy.user_id = userId
      if (key?.dropId) delete copy.id
      return copy
    })

    for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
      const batch = prepared.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from(table)
        // The rows come from a backup of these same tables, so their shape
        // matches; the generated types cannot express "any table" here.
        .upsert(batch as never, { onConflict: key?.onConflict ?? 'id' })
      if (error) {
        throw new Error(`Restore stopped at ${table.replace(/_/g, ' ')}: ${error.message}. Tables before it were restored.`)
      }
    }
    written.push({ table, rows: rows.length })
  }
  return written
}
