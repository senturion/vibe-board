import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Service-role calls bypass RLS; we MUST scope every query by user_id ourselves.
export type HabitToolDeps = {
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

// Codebase convention: DayOfWeek 1=Mon..7=Sun (see lib/types/shared.ts
// `getCurrentDayOfWeek`). JS Date.getUTCDay() returns 0=Sun..6=Sat — convert.
function dayOfWeekFromDateString(date: string): number {
  // YYYY-MM-DD interpreted at UTC midnight.
  const d = new Date(date + 'T00:00:00Z')
  const js = d.getUTCDay() // 0=Sun..6=Sat
  return js === 0 ? 7 : js
}

function todayUtcDate(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------- list_habits ----------

export const listHabitsShape = {
  include_archived: z.boolean().optional(),
}
export type ListHabitsArgs = z.infer<z.ZodObject<typeof listHabitsShape>>

export async function listHabits(
  args: ListHabitsArgs,
  deps: HabitToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const owner = deps.ownerId()

  let q = supabase.from('habits').select('*').eq('user_id', owner)
  if (!args.include_archived) {
    q = q.eq('is_active', true).is('archived_at', null)
  }
  const { data: habits, error } = await q.order('order', { ascending: true })
  if (error) throw new Error(error.message)

  const habitRows =
    (habits as Array<Record<string, unknown>> | null) ?? []

  // Fetch streaks + categories for the owner. Two extra round-trips, then merge
  // in-memory by habit_id / category_id.
  const { data: streaks, error: streakErr } = await supabase
    .from('habit_streaks')
    .select('habit_id, current_streak, best_streak')
    .eq('user_id', owner)
  if (streakErr) throw new Error(streakErr.message)

  const { data: categories, error: catErr } = await supabase
    .from('habit_categories')
    .select('id, name, color')
    .eq('user_id', owner)
  if (catErr) throw new Error(catErr.message)

  const streakByHabit = new Map<
    string,
    { current_streak: number; best_streak: number }
  >()
  for (const s of (streaks as Array<{
    habit_id: string
    current_streak: number
    best_streak: number
  }> | null) ?? []) {
    streakByHabit.set(s.habit_id, {
      current_streak: s.current_streak,
      best_streak: s.best_streak,
    })
  }

  const categoryById = new Map<string, { name: string; color: string }>()
  for (const c of (categories as Array<{
    id: string
    name: string
    color: string
  }> | null) ?? []) {
    categoryById.set(c.id, { name: c.name, color: c.color })
  }

  const merged = habitRows.map((h) => {
    const s = streakByHabit.get(h.id as string)
    const cat = h.category_id
      ? categoryById.get(h.category_id as string) ?? null
      : null
    return {
      ...h,
      current_streak: s?.current_streak ?? 0,
      best_streak: s?.best_streak ?? 0,
      category_name: cat?.name ?? null,
      category_color: cat?.color ?? null,
    }
  })

  return ok(merged)
}

// ---------- get_habit_status ----------

export const getHabitStatusShape = {
  date: z.string().optional(), // YYYY-MM-DD
}
export type GetHabitStatusArgs = z.infer<z.ZodObject<typeof getHabitStatusShape>>

export async function getHabitStatus(
  args: GetHabitStatusArgs,
  deps: HabitToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const owner = deps.ownerId()
  const date = args.date ?? todayUtcDate()
  const dow = dayOfWeekFromDateString(date)

  const { data: habits, error } = await supabase
    .from('habits')
    .select('id, name, frequency_type, specific_days, target_count')
    .eq('user_id', owner)
    .eq('is_active', true)
    .is('archived_at', null)
  if (error) throw new Error(error.message)

  const allHabits =
    (habits as Array<{
      id: string
      name: string
      frequency_type: string
      specific_days: number[] | null
      target_count: number
    }> | null) ?? []

  const dueHabits = allHabits.filter((h) => {
    if (h.frequency_type === 'daily') return true
    if (h.frequency_type === 'weekly') return true
    if (h.frequency_type === 'specific_days') {
      return Array.isArray(h.specific_days) && h.specific_days.includes(dow)
    }
    return false
  })

  const { data: completions, error: cErr } = await supabase
    .from('habit_completions')
    .select('habit_id, count')
    .eq('user_id', owner)
    .eq('completion_date', date)
  if (cErr) throw new Error(cErr.message)

  const sumByHabit = new Map<string, number>()
  for (const c of (completions as Array<{
    habit_id: string
    count: number
  }> | null) ?? []) {
    sumByHabit.set(c.habit_id, (sumByHabit.get(c.habit_id) ?? 0) + c.count)
  }

  const status = dueHabits.map((h) => {
    const completions_today = sumByHabit.get(h.id) ?? 0
    return {
      habit_id: h.id,
      name: h.name,
      target_count: h.target_count,
      completions_today,
      done: completions_today >= h.target_count,
    }
  })

  return ok(status)
}

// ---------- list_habit_history ----------

export const listHabitHistoryShape = {
  habit_id: z.string().optional(),
  from: z.string(),
  to: z.string(),
}
export type ListHabitHistoryArgs = z.infer<
  z.ZodObject<typeof listHabitHistoryShape>
>

export async function listHabitHistory(
  args: ListHabitHistoryArgs,
  deps: HabitToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  let q = supabase
    .from('habit_completions')
    .select('*')
    .eq('user_id', deps.ownerId())
  if (args.habit_id) q = q.eq('habit_id', args.habit_id)
  q = q.gte('completion_date', args.from).lte('completion_date', args.to)
  const { data, error } = await q.order('completion_date', { ascending: true })
  if (error) throw new Error(error.message)
  return ok(data ?? [])
}

// ---------- log_habit_completion ----------

export const logHabitCompletionShape = {
  habit_id: z.string(),
  date: z.string().optional(), // YYYY-MM-DD
  count: z.number().optional(),
  note: z.string().optional(),
}
export type LogHabitCompletionArgs = z.infer<
  z.ZodObject<typeof logHabitCompletionShape>
>

export async function logHabitCompletion(
  args: LogHabitCompletionArgs,
  deps: HabitToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const insert = {
    user_id: deps.ownerId(),
    habit_id: args.habit_id,
    completion_date: args.date ?? todayUtcDate(),
    count: args.count ?? 1,
    note: args.note,
  }
  // NOTE: do NOT touch habit_streaks here — the app's own logic recalculates it.
  const { data, error } = await supabase
    .from('habit_completions')
    .insert(insert)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return ok(data)
}

// ---------- create_habit ----------

export const createHabitShape = {
  name: z.string(),
  description: z.string().optional(),
  frequency_type: z.enum(['daily', 'weekly', 'specific_days']).optional(),
  frequency_value: z.number().optional(),
  specific_days: z.array(z.number()).optional(),
  target_count: z.number().optional(),
  habit_type: z.enum(['build', 'avoid']).optional(),
  category_id: z.string().optional(),
}
export type CreateHabitArgs = z.infer<z.ZodObject<typeof createHabitShape>>

export async function createHabit(
  args: CreateHabitArgs,
  deps: HabitToolDeps,
): Promise<McpResult> {
  const supabase = deps.getClient()
  const insert = {
    user_id: deps.ownerId(),
    name: args.name,
    description: args.description,
    frequency_type: args.frequency_type ?? 'daily',
    frequency_value: args.frequency_value ?? 1,
    specific_days: args.specific_days,
    target_count: args.target_count ?? 1,
    habit_type: args.habit_type ?? 'build',
    category_id: args.category_id,
    is_active: true,
  }
  const { data, error } = await supabase
    .from('habits')
    .insert(insert)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return ok(data)
}

// ---------- registration ----------

export function registerHabitTools(server: ServerLike, deps: HabitToolDeps) {
  server.tool(
    'list_habits',
    'List the owner’s habits. Default excludes archived/inactive (pass include_archived=true to include). Each row is merged with current_streak, best_streak (from habit_streaks) and category_name, category_color (from habit_categories, null if no category). Ordered by "order" asc.',
    listHabitsShape,
    (args) => listHabits(args as ListHabitsArgs, deps),
  )
  server.tool(
    'get_habit_status',
    'Return per-habit completion status for a given date (default = today UTC) for habits due on that date. Each entry: { habit_id, name, target_count, completions_today, done }. Due rules: daily/weekly always due; specific_days due if dayOfWeek (1=Mon..7=Sun) is in specific_days.',
    getHabitStatusShape,
    (args) => getHabitStatus(args as GetHabitStatusArgs, deps),
  )
  server.tool(
    'list_habit_history',
    'List habit_completions rows for the owner in [from, to] (YYYY-MM-DD). Optional habit_id filter. Ordered by completion_date asc.',
    listHabitHistoryShape,
    (args) => listHabitHistory(args as ListHabitHistoryArgs, deps),
  )
  server.tool(
    'log_habit_completion',
    'Insert a habit_completions row. Defaults: date=today UTC, count=1. Returns the inserted row. Does NOT touch habit_streaks — the app recalculates it.',
    logHabitCompletionShape,
    (args) => logHabitCompletion(args as LogHabitCompletionArgs, deps),
  )
  server.tool(
    'create_habit',
    'Create a habit for the owner. Defaults: frequency_type=daily, frequency_value=1, target_count=1, habit_type=build, is_active=true. Returns the created row.',
    createHabitShape,
    (args) => createHabit(args as CreateHabitArgs, deps),
  )
}
