import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Service-role calls bypass RLS; we MUST scope every query by user_id ourselves.
export type TodoToolDeps = {
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

// ---------- list_todos ----------

export const listTodosShape = {
  include_completed: z.boolean().optional(),
}
export type ListTodosArgs = z.infer<z.ZodObject<typeof listTodosShape>>

export async function listTodos(
  args: ListTodosArgs,
  deps: TodoToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  let q = supabase.from('todos').select('*').eq('user_id', deps.ownerId())
  if (args.include_completed !== true) q = q.eq('completed', false)
  const { data, error } = await q
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return ok(data ?? [])
}

// ---------- create_todo ----------

export const createTodoShape = {
  text: z.string(),
}
export type CreateTodoArgs = z.infer<z.ZodObject<typeof createTodoShape>>

export async function createTodo(
  args: CreateTodoArgs,
  deps: TodoToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const insert = {
    user_id: deps.ownerId(),
    text: args.text,
    completed: false,
  }
  const { data, error } = await supabase
    .from('todos')
    .insert(insert)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return ok(data)
}

// ---------- registration ----------

export function registerTodoTools(server: ServerLike, deps: TodoToolDeps) {
  server.tool(
    'list_todos',
    'List the owner’s todos ordered by created_at desc, limit 100. By default excludes completed; pass include_completed=true to include them.',
    listTodosShape,
    (args) => listTodos(args as ListTodosArgs, deps),
  )
  server.tool(
    'create_todo',
    'Create a todo for the owner with completed=false. Returns the created row.',
    createTodoShape,
    (args) => createTodo(args as CreateTodoArgs, deps),
  )
}
