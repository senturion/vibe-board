import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Service-role calls bypass RLS; we MUST scope every query by user_id ourselves.
export type BoardToolDeps = {
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

// ---------- list_boards ----------

export const listBoardsShape = {}
export type ListBoardsArgs = Record<string, never>

export async function listBoards(
  _args: ListBoardsArgs,
  deps: BoardToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const owner = deps.ownerId()

  const { data: boards, error: boardsError } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', owner)
    .order('created_at', { ascending: true })
  if (boardsError) throw new Error(boardsError.message)

  const { data: settingsRows, error: settingsError } = await supabase
    .from('user_settings')
    .select('active_board_id')
    .eq('user_id', owner)
  if (settingsError) throw new Error(settingsError.message)

  const activeBoardId =
    (settingsRows?.[0] as { active_board_id?: string | null } | undefined)
      ?.active_board_id ?? null

  const rows = (boards ?? []).map((b) => {
    const row = b as { id: string } & Record<string, unknown>
    return { ...row, is_active: row.id === activeBoardId }
  })

  return ok(rows)
}

// ---------- registration ----------

export function registerBoardTools(server: ServerLike, deps: BoardToolDeps) {
  server.tool(
    'list_boards',
    'List the owner’s boards ordered by created_at asc. Each row includes is_active=true if it matches user_settings.active_board_id.',
    listBoardsShape,
    (args) => listBoards(args as ListBoardsArgs, deps),
  )
}
