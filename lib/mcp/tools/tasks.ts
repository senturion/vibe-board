import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Service-role calls bypass RLS; we MUST scope every query by user_id ourselves.
export type TaskToolDeps = {
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

// ---------- list_tasks ----------

export const listTasksShape = {
  board_id: z.string().optional(),
  status: z.string().optional(),
  due_before: z.string().optional(),
  due_after: z.string().optional(),
  labels: z.array(z.string()).optional(),
}
export type ListTasksArgs = z.infer<z.ZodObject<typeof listTasksShape>>

export async function listTasks(
  args: ListTasksArgs,
  deps: TaskToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  let q = supabase.from('tasks').select('*').eq('user_id', deps.ownerId())
  if (args.board_id) q = q.eq('board_id', args.board_id)
  if (args.status) q = q.eq('status', args.status)
  if (args.due_before) q = q.lte('due_date', args.due_before)
  if (args.due_after) q = q.gte('due_date', args.due_after)
  if (args.labels && args.labels.length > 0) q = q.contains('labels', args.labels)
  const { data, error } = await q
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('order', { ascending: true })
    .limit(100)
  if (error) throw new Error(error.message)
  return ok(data ?? [])
}

// ---------- get_task ----------

export const getTaskShape = { id: z.string() }
export type GetTaskArgs = z.infer<z.ZodObject<typeof getTaskShape>>

export async function getTask(
  args: GetTaskArgs,
  deps: TaskToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', args.id)
    .eq('user_id', deps.ownerId())
    .single()
  if (error) throw new Error(error.message)
  return ok(data)
}

// ---------- create_task ----------

export const createTaskShape = {
  board_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  labels: z.array(z.string()).optional(),
  due_date: z.string().optional(),
}
export type CreateTaskArgs = z.infer<z.ZodObject<typeof createTaskShape>>

export async function createTask(
  args: CreateTaskArgs,
  deps: TaskToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const insert = { ...args, user_id: deps.ownerId() }
  const { data, error } = await supabase
    .from('tasks')
    .insert(insert)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return ok(data)
}

// ---------- update_task ----------

export const updateTaskShape = {
  id: z.string(),
  patch: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    labels: z.array(z.string()).optional(),
    due_date: z.string().nullable().optional(),
    order: z.number().optional(),
  }),
}
export type UpdateTaskArgs = z.infer<z.ZodObject<typeof updateTaskShape>>

export async function updateTask(
  args: UpdateTaskArgs,
  deps: TaskToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  // patch.order maps to the quoted "order" column — Supabase handles quoting.
  const patch: Record<string, unknown> = {
    ...args.patch,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', args.id)
    .eq('user_id', deps.ownerId())
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return ok(data)
}

// ---------- complete_task ----------

export const completeTaskShape = { id: z.string() }
export type CompleteTaskArgs = z.infer<z.ZodObject<typeof completeTaskShape>>

export async function completeTask(
  args: CompleteTaskArgs,
  deps: TaskToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'done', completed_at: now, updated_at: now })
    .eq('id', args.id)
    .eq('user_id', deps.ownerId())
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return ok(data)
}

// ---------- registration ----------

export function registerTaskTools(server: ServerLike, deps: TaskToolDeps) {
  server.tool(
    'list_tasks',
    'List the owner’s tasks with optional filters (board, status, due window, labels). Returns up to 100 rows ordered by due_date asc nulls last, then order asc.',
    listTasksShape,
    (args) => listTasks(args as ListTasksArgs, deps),
  )
  server.tool(
    'get_task',
    'Get a single task by id (scoped to the owner).',
    getTaskShape,
    (args) => getTask(args as GetTaskArgs, deps),
  )
  server.tool(
    'create_task',
    'Create a task on a board owned by the owner. Returns the created row.',
    createTaskShape,
    (args) => createTask(args as CreateTaskArgs, deps),
  )
  server.tool(
    'update_task',
    'Patch a task by id. patch.order maps to the "order" column. Returns the updated row.',
    updateTaskShape,
    (args) => updateTask(args as UpdateTaskArgs, deps),
  )
  server.tool(
    'complete_task',
    'Mark a task done — sets status=done, completed_at=now, updated_at=now. Returns the updated row.',
    completeTaskShape,
    (args) => completeTask(args as CompleteTaskArgs, deps),
  )
}
