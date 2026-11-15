import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Subtask shape matches the app's `lib/types/kanban.ts` Subtask interface.
// Accept either a plain string (we'll synthesize id + completed:false) or the full object.
const subtaskInputSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    text: z.string(),
    completed: z.boolean().optional(),
  }),
])

function normalizeSubtasks(items: z.infer<typeof subtaskInputSchema>[] | undefined) {
  if (!items) return undefined
  return items.map((it) =>
    typeof it === 'string'
      ? { id: randomUUID(), text: it, completed: false }
      : { id: it.id ?? randomUUID(), text: it.text, completed: it.completed ?? false },
  )
}

const DEFAULT_STATUSES = ['backlog', 'todo', 'in-progress', 'complete']
const COMPLETE_STATUS = 'complete'

// Names an assistant is likely to reach for, mapped to the board's real column ids.
const STATUS_ALIASES: Record<string, string> = {
  done: 'complete',
  completed: 'complete',
  finished: 'complete',
  'in progress': 'in-progress',
  in_progress: 'in-progress',
  inprogress: 'in-progress',
  doing: 'in-progress',
  'to do': 'todo',
  'to-do': 'todo',
  to_do: 'todo',
}

export function normalizeStatus(value: string): string {
  const key = value.trim().toLowerCase()
  return STATUS_ALIASES[key] ?? key
}

/** Accepts YYYY-MM-DD (or a full timestamp) and stores midnight UTC of that calendar day. */
export function normalizeDueDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match || Number.isNaN(Date.parse(`${match[0]}T00:00:00.000Z`))) {
    throw new Error(`due_date must be YYYY-MM-DD, got "${value}"`)
  }
  return `${match[0]}T00:00:00.000Z`
}

const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

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

/**
 * A task only shows on the board when its status is one of the board's column
 * ids: the four built-in columns plus any custom ones saved in the owner's
 * settings. Anything else would silently hide the task.
 */
async function resolveStatus(
  raw: string,
  boardId: string,
  deps: TaskToolDeps,
): Promise<string> {
  const status = normalizeStatus(raw)
  if (DEFAULT_STATUSES.includes(status)) return status

  const { data, error } = await deps
    .getClient()
    .from('user_settings')
    .select('app_settings')
    .eq('user_id', deps.ownerId())
    .maybeSingle()
  if (error) throw new Error(error.message)

  const settings = (data?.app_settings ?? null) as {
    boardCustomColumns?: Record<string, Array<{ id?: unknown }>>
  } | null
  const custom = settings?.boardCustomColumns?.[boardId]
  const customIds = Array.isArray(custom)
    ? custom.map((c) => c?.id).filter((id): id is string => typeof id === 'string')
    : []
  if (customIds.includes(status)) return status

  const allowed = [...DEFAULT_STATUSES, ...customIds].join(', ')
  throw new Error(`Unknown status "${raw}". Allowed for this board: ${allowed}`)
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
  if (args.status) q = q.eq('status', normalizeStatus(args.status))
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
  priority: prioritySchema.optional(),
  labels: z.array(z.string()).optional(),
  due_date: z.string().optional(), // YYYY-MM-DD
  // Each item: plain string ("buy milk") OR { text, completed?, id? }. IDs auto-generated if missing.
  subtasks: z.array(subtaskInputSchema).optional(),
}
export type CreateTaskArgs = z.infer<z.ZodObject<typeof createTaskShape>>

export async function createTask(
  args: CreateTaskArgs,
  deps: TaskToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const { subtasks, status: rawStatus, due_date, ...rest } = args
  const status = rawStatus ? await resolveStatus(rawStatus, args.board_id, deps) : undefined
  const insert = {
    ...rest,
    ...(status !== undefined ? { status } : {}),
    ...(status === COMPLETE_STATUS ? { completed_at: new Date().toISOString() } : {}),
    ...(due_date !== undefined ? { due_date: normalizeDueDate(due_date) } : {}),
    ...(subtasks !== undefined ? { subtasks: normalizeSubtasks(subtasks) } : {}),
    user_id: deps.ownerId(),
  }
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
    priority: prioritySchema.optional(),
    labels: z.array(z.string()).optional(),
    due_date: z.string().nullable().optional(), // YYYY-MM-DD, or null to clear
    order: z.number().optional(),
    // Full replacement of the subtasks array. Same input format as create_task.
    subtasks: z.array(subtaskInputSchema).optional(),
  }),
}
export type UpdateTaskArgs = z.infer<z.ZodObject<typeof updateTaskShape>>

export async function updateTask(
  args: UpdateTaskArgs,
  deps: TaskToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  // patch.order maps to the quoted "order" column — Supabase handles quoting.
  const { subtasks, status: rawStatus, due_date, ...rest } = args.patch
  const now = new Date().toISOString()
  const patch: Database['public']['Tables']['tasks']['Update'] = {
    ...rest,
    ...(due_date !== undefined
      ? { due_date: due_date === null ? null : normalizeDueDate(due_date) }
      : {}),
    ...(subtasks !== undefined ? { subtasks: normalizeSubtasks(subtasks) } : {}),
    updated_at: now,
  }

  if (rawStatus !== undefined) {
    // The allowed columns depend on the task's board, and completed_at follows
    // the move in or out of the complete column, as it does in the app.
    const { data: current, error: currentError } = await supabase
      .from('tasks')
      .select('board_id, status, completed_at')
      .eq('id', args.id)
      .eq('user_id', deps.ownerId())
      .single()
    if (currentError) throw new Error(currentError.message)

    const status = await resolveStatus(rawStatus, current.board_id, deps)
    patch.status = status
    if (status === COMPLETE_STATUS) {
      patch.completed_at = current.completed_at ?? now
    } else if (current.status === COMPLETE_STATUS) {
      patch.completed_at = null
    }
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
    .update({ status: COMPLETE_STATUS, completed_at: now, updated_at: now })
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
    'List the owner’s tasks with optional filters (board, status, due window, labels). Status is a column id: backlog, todo, in-progress, complete, or a custom column id. Returns up to 100 rows ordered by due_date asc nulls last, then order asc.',
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
    'Create a task on a board owned by the owner. status must be a column id (backlog, todo, in-progress, complete, or a custom column of that board; default backlog). priority is low, medium, high or urgent. due_date is YYYY-MM-DD. Supports optional subtasks (array of strings or {text, completed?, id?} objects — ids auto-generated). Returns the created row.',
    createTaskShape,
    (args) => createTask(args as CreateTaskArgs, deps),
  )
  server.tool(
    'update_task',
    'Patch a task by id. patch.status must be a column id (backlog, todo, in-progress, complete, or a custom column of the task’s board). patch.priority is low, medium, high or urgent. patch.due_date is YYYY-MM-DD or null to clear. patch.order maps to the "order" column. patch.subtasks fully replaces the subtasks array (same input format as create_task). Returns the updated row.',
    updateTaskShape,
    (args) => updateTask(args as UpdateTaskArgs, deps),
  )
  server.tool(
    'complete_task',
    'Mark a task complete — sets status=complete, completed_at=now, updated_at=now. Returns the updated row.',
    completeTaskShape,
    (args) => completeTask(args as CompleteTaskArgs, deps),
  )
}
