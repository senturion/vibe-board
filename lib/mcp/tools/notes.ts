import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Service-role calls bypass RLS; we MUST scope every query by user_id ourselves.
export type NoteToolDeps = {
  getClient: () => SupabaseClient<Database>
  ownerId: () => string
}

type McpResult = {
  content: Array<{ type: 'text'; text: string }>
}

const ok = (value: unknown): McpResult => ({
  content: [{ type: 'text', text: JSON.stringify(value) }],
})

// Minimal MCP server surface — typed loosely so tests can pass a stub.
type ServerLike = {
  tool: (
    name: string,
    description: string,
    inputSchemaShape: Record<string, z.ZodTypeAny>,
    handler: (args: unknown) => Promise<McpResult>,
  ) => unknown
}

// ---------- get_notes ----------

export const getNotesShape = {}
export type GetNotesArgs = Record<string, never>

export async function getNotes(
  _args: GetNotesArgs,
  deps: NoteToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('notes')
    .select('content, updated_at')
    .eq('user_id', deps.ownerId())
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (!data) return ok({ content: '', updated_at: null })

  const row = data as { content: string; updated_at: string }
  return ok({ content: row.content, updated_at: row.updated_at })
}

// ---------- append_note ----------

export const appendNoteShape = {
  text: z.string(),
  separator: z.string().optional(),
}
export type AppendNoteArgs = z.infer<z.ZodObject<typeof appendNoteShape>>

export async function appendNote(
  args: AppendNoteArgs,
  deps: NoteToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const owner = deps.ownerId()
  const separator = args.separator ?? '\n\n'

  // notes has no unique constraint on user_id, so we cannot upsert by user_id.
  // Mirror hooks/useNotes.ts: select existing → update by id, else insert.
  const { data: existing, error: selectError } = await supabase
    .from('notes')
    .select('id, content')
    .eq('user_id', owner)
    .maybeSingle()
  if (selectError) throw new Error(selectError.message)

  const existingRow = existing as { id: string; content: string } | null
  const newContent =
    existingRow === null ? args.text : existingRow.content + separator + args.text
  const updatedAt = new Date().toISOString()

  if (existingRow) {
    const { data: updated, error: updateError } = await supabase
      .from('notes')
      .update({ content: newContent, updated_at: updatedAt })
      .eq('id', existingRow.id)
      .eq('user_id', owner)
      .select('content, updated_at')
      .single()
    if (updateError) throw new Error(updateError.message)
    const row = updated as { content: string; updated_at: string }
    return ok({ content: row.content, updated_at: row.updated_at })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('notes')
    .insert({ user_id: owner, content: newContent })
    .select('content, updated_at')
    .single()
  if (insertError) throw new Error(insertError.message)
  const row = inserted as { content: string; updated_at: string }
  return ok({ content: row.content, updated_at: row.updated_at })
}

// ---------- registration ----------

export function registerNoteTools(server: ServerLike, deps: NoteToolDeps) {
  server.tool(
    'get_notes',
    'Get the owner’s notes row. Returns { content, updated_at } if it exists, otherwise { content: "", updated_at: null }.',
    getNotesShape,
    (args) => getNotes(args as GetNotesArgs, deps),
  )
  server.tool(
    'append_note',
    'Append text to the owner’s notes row. Joins existing content with separator (default "\\n\\n") + text. Creates the row if missing. Returns { content, updated_at } for the new state.',
    appendNoteShape,
    (args) => appendNote(args as AppendNoteArgs, deps),
  )
}
