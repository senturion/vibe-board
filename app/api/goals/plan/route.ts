import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'
import { ColumnId, Goal, GoalPlannerProvider, GoalTaskPlanOptions, GoalPriority, GoalStatus, Milestone } from '@/lib/types'
import { generateGoalTaskSuggestions } from '@/lib/planner/goalTaskPlanner'
import { generateGoalTaskSuggestionsFromLLM, GoalPlannerPreference } from '@/lib/planner/llmPlanner'

type GoalRow = Database['public']['Tables']['goals']['Row']
type MilestoneRow = Database['public']['Tables']['milestones']['Row']
type UserSettingsRow = Database['public']['Tables']['user_settings']['Row']

const VALID_COLUMNS = new Set<ColumnId>(['backlog', 'todo', 'in-progress', 'complete'])

function sanitizeOptions(value: unknown): GoalTaskPlanOptions {
  const raw = (value && typeof value === 'object') ? value as Record<string, unknown> : {}

  const rawColumn = typeof raw.column === 'string' ? raw.column : 'todo'
  const rawBoardId = typeof raw.boardId === 'string' ? raw.boardId : ''
  const rawHorizon = typeof raw.horizonDays === 'number' ? raw.horizonDays : Number(raw.horizonDays)
  const rawMaxTasks = typeof raw.maxTasks === 'number' ? raw.maxTasks : Number(raw.maxTasks)

  return {
    boardId: rawBoardId,
    column: VALID_COLUMNS.has(rawColumn as ColumnId) ? rawColumn as ColumnId : 'todo',
    horizonDays: Number.isFinite(rawHorizon) ? Math.min(60, Math.max(1, Math.round(rawHorizon))) : 14,
    maxTasks: Number.isFinite(rawMaxTasks) ? Math.min(12, Math.max(1, Math.round(rawMaxTasks))) : 6,
  }
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    categoryId: row.category_id || undefined,
    title: row.title,
    description: row.description || undefined,
    targetDate: row.target_date || undefined,
    startDate: row.start_date || new Date().toISOString().split('T')[0],
    status: row.status as GoalStatus,
    progress: row.progress,
    priority: row.priority as GoalPriority,
    order: row.order,
    createdAt: new Date(row.created_at).getTime(),
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
    archivedAt: row.archived_at ? new Date(row.archived_at).getTime() : undefined,
  }
}

function mapMilestones(rows: MilestoneRow[]): Milestone[] {
  return rows.map(row => ({
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    description: row.description || undefined,
    targetDate: row.target_date || undefined,
    isCompleted: row.is_completed,
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
    order: row.order,
    createdAt: new Date(row.created_at).getTime(),
  }))
}

function parsePlannerPreference(appSettings: UserSettingsRow['app_settings']): GoalPlannerPreference {
  if (!appSettings || typeof appSettings !== 'object' || Array.isArray(appSettings)) {
    return {}
  }

  const settings = appSettings as Record<string, unknown>
  const rawProvider = typeof settings.aiProvider === 'string'
    ? settings.aiProvider.trim()
    : typeof settings.goalPlannerProvider === 'string'
      ? settings.goalPlannerProvider.trim()
    : ''
  const rawModel = typeof settings.aiModel === 'string'
    ? settings.aiModel.trim().slice(0, 120)
    : typeof settings.goalPlannerModel === 'string'
      ? settings.goalPlannerModel.trim().slice(0, 120)
    : ''
  const rawBaseUrl = typeof settings.aiApiBaseUrl === 'string'
    ? settings.aiApiBaseUrl.trim().slice(0, 240)
    : ''
  const rawApiKey = typeof settings.aiApiKey === 'string'
    ? settings.aiApiKey.trim().slice(0, 500)
    : ''

  const provider = (
    rawProvider === 'rules' ||
    rawProvider === 'openai' ||
    rawProvider === 'openai-compatible' ||
    rawProvider === 'ollama' ||
    rawProvider === 'anthropic'
  ) ? rawProvider as GoalPlannerProvider : undefined

  return {
    provider,
    model: rawModel || undefined,
    baseUrl: rawBaseUrl || undefined,
    apiKey: rawApiKey || undefined,
  }
}

function parseRequestPlannerPreference(value: unknown): GoalPlannerPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const payload = value as Record<string, unknown>
  const provider = (
    typeof payload.provider === 'string' &&
    (payload.provider === 'rules' ||
      payload.provider === 'openai' ||
      payload.provider === 'openai-compatible' ||
      payload.provider === 'ollama' ||
      payload.provider === 'anthropic')
  ) ? payload.provider as GoalPlannerProvider : undefined

  const model = typeof payload.model === 'string' ? payload.model.trim().slice(0, 120) : undefined
  const baseUrl = typeof payload.baseUrl === 'string' ? payload.baseUrl.trim().slice(0, 240) : undefined
  const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim().slice(0, 500) : undefined

  return {
    provider,
    model: model || undefined,
    baseUrl: baseUrl || undefined,
    apiKey: apiKey || undefined,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const rawGoalId = typeof body.goalId === 'string' ? body.goalId.trim() : ''
  if (!rawGoalId) {
    return NextResponse.json({ error: 'Missing goalId' }, { status: 400 })
  }

  const options = sanitizeOptions(body.options)

  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', rawGoalId)
    .eq('user_id', user.id)
    .is('archived_at', null)
    .single()

  if (goalError || !goalRow) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('milestones')
    .select('*')
    .eq('goal_id', rawGoalId)
    .eq('user_id', user.id)
    .order('order', { ascending: true })

  if (milestoneError) {
    return NextResponse.json({ error: 'Failed to load milestones' }, { status: 500 })
  }

  const { data: linkRows, error: linkError } = await supabase
    .from('goal_task_links')
    .select('task_id')
    .eq('goal_id', rawGoalId)
    .eq('user_id', user.id)

  if (linkError) {
    return NextResponse.json({ error: 'Failed to load linked tasks' }, { status: 500 })
  }

  const taskIds = (linkRows || []).map(row => row.task_id)
  let existingTaskTitles: string[] = []

  if (taskIds.length > 0) {
    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select('title')
      .in('id', taskIds)
      .eq('user_id', user.id)

    if (taskError) {
      return NextResponse.json({ error: 'Failed to load linked task titles' }, { status: 500 })
    }

    existingTaskTitles = (taskRows || []).map(row => row.title).filter(Boolean)
  }

  const goal = mapGoal(goalRow)
  const milestones = mapMilestones((milestoneRows || []) as MilestoneRow[])
  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('app_settings')
    .eq('user_id', user.id)
    .maybeSingle()

  const plannerPreference = parsePlannerPreference((settingsRow as Pick<UserSettingsRow, 'app_settings'> | null)?.app_settings || null)
  const requestPreference = parseRequestPlannerPreference(body.aiSettings)
  const effectivePlannerPreference = {
    ...plannerPreference,
    ...requestPreference,
  }

  const llmResult = await generateGoalTaskSuggestionsFromLLM({
    goal,
    milestones,
    options,
    existingTaskTitles,
  }, effectivePlannerPreference)

  if (llmResult && llmResult.suggestions.length > 0) {
    return NextResponse.json({
      suggestions: llmResult.suggestions,
      source: 'llm',
      provider: llmResult.provider,
    })
  }

  const suggestions = generateGoalTaskSuggestions({
    goal,
    milestones,
    options,
    existingTaskTitles,
  })

  return NextResponse.json({
    suggestions,
    source: 'rules',
    provider: 'rules',
  })
}
