import {
  COLUMNS,
  ColumnId,
  Goal,
  GoalPlannerProvider,
  GoalTaskPlanOptions,
  GoalTaskSuggestion,
  Milestone,
  Priority,
} from '@/lib/types'
import { buildGoalTaskPlanHash } from '@/lib/planner/goalTaskPlanner'
import { complete } from '@/lib/ai'
import { extractJsonString } from '@/lib/ai/json'
import { stripTrailingSlash } from '@/lib/ai/http'
import type { AIProvider } from '@/lib/ai'

type PlannerProvider = 'rules' | 'openai' | 'openai-compatible' | 'ollama' | 'anthropic'

type RawSuggestion = {
  title?: unknown
  description?: unknown
  dueDate?: unknown
  priority?: unknown
  milestoneTitle?: unknown
}

type RawPlanResponse = {
  suggestions?: unknown
}

interface LLMPlanParams {
  goal: Goal
  milestones: Milestone[]
  options: GoalTaskPlanOptions
  existingTaskTitles: string[]
}

export interface GoalPlannerPreference {
  provider?: GoalPlannerProvider
  model?: string
  baseUrl?: string
  apiKey?: string
}

export interface LLMPlanResult {
  suggestions: GoalTaskSuggestion[]
  provider: Exclude<PlannerProvider, 'rules'>
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const TEMPLATE_CYCLE: GoalTaskSuggestion['template'][] = ['scope', 'first_action', 'review']
const VALID_COLUMNS = new Set<ColumnId>(COLUMNS.map((column) => column.id))

const OLLAMA_JSON_SCHEMA = {
  type: 'object',
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'priority'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          dueDate: { type: 'string' },
          priority: { type: 'string' },
          milestoneTitle: { type: 'string' },
        },
      },
    },
  },
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function clampDateKey(dateKey: string, minDateKey: string, maxDateKey: string) {
  if (dateKey < minDateKey) return minDateKey
  if (dateKey > maxDateKey) return maxDateKey
  return dateKey
}

function parseDateKey(value?: string) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return value
}

function normalizePriority(value: unknown, fallback: Priority): Priority {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (PRIORITIES.includes(normalized as Priority)) return normalized as Priority
  if (normalized.includes('urgent')) return 'urgent'
  if (normalized.includes('high')) return 'high'
  if (normalized.includes('low')) return 'low'
  return fallback
}

function sanitizeProvider(value: unknown): PlannerProvider | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().toLowerCase()
  if (raw === 'openai' || raw === 'openai-compatible' || raw === 'ollama' || raw === 'anthropic' || raw === 'rules') {
    return raw
  }
  return null
}

function sanitizeModel(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 120)
}

function sanitizeBaseUrl(value: unknown) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim().slice(0, 240)
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return stripTrailingSlash(url.toString())
  } catch {
    return ''
  }
}

function sanitizeApiKey(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 500)
}

function resolveProvider(preference?: GoalPlannerPreference): PlannerProvider {
  const preferredProvider = sanitizeProvider(preference?.provider)
  const rawProvider = (preferredProvider || process.env.GOAL_PLANNER_PROVIDER || 'rules').trim().toLowerCase()
  if (
    rawProvider === 'openai' ||
    rawProvider === 'openai-compatible' ||
    rawProvider === 'ollama' ||
    rawProvider === 'anthropic'
  ) {
    return rawProvider
  }
  return 'rules'
}

function parseRawSuggestions(value: unknown): RawSuggestion[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.filter(item => item && typeof item === 'object') as RawSuggestion[]
  }

  if (typeof value === 'object') {
    const record = value as RawPlanResponse
    if (Array.isArray(record.suggestions)) {
      return record.suggestions.filter(item => item && typeof item === 'object') as RawSuggestion[]
    }
  }

  if (typeof value === 'string') {
    const jsonText = extractJsonString(value)
    if (!jsonText) return []

    try {
      const parsed = JSON.parse(jsonText)
      return parseRawSuggestions(parsed)
    } catch {
      return []
    }
  }

  return []
}

function findMilestoneByTitle(milestones: Milestone[], milestoneTitle?: string) {
  if (!milestoneTitle) return null
  const target = normalizeTitle(milestoneTitle)
  if (!target) return null

  return milestones.find((milestone) => normalizeTitle(milestone.title) === target) || null
}

function mapRawSuggestions(params: LLMPlanParams, rawSuggestions: RawSuggestion[]) {
  const { goal, milestones, options, existingTaskTitles } = params
  const today = new Date()
  const minDateKey = toDateKey(today)
  const maxDateKey = toDateKey(addDays(today, Math.max(1, options.horizonDays) - 1))
  const defaultDueDate = toDateKey(addDays(today, 1))
  const planHash = buildGoalTaskPlanHash(goal.id, milestones, options)

  const seenTitles = new Set(existingTaskTitles.map(normalizeTitle))
  const suggestions: GoalTaskSuggestion[] = []

  for (const [index, raw] of rawSuggestions.entries()) {
    if (suggestions.length >= options.maxTasks) break

    const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : ''
    if (!rawTitle) continue

    const normalizedTitle = normalizeTitle(rawTitle)
    if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue

    const priority = normalizePriority(raw.priority, index % 3 === 1 ? 'high' : 'medium')

    const dateCandidate = typeof raw.dueDate === 'string' ? parseDateKey(raw.dueDate.trim()) : null
    const dueDate = clampDateKey(dateCandidate || defaultDueDate, minDateKey, maxDateKey)

    const milestoneTitle = typeof raw.milestoneTitle === 'string' ? raw.milestoneTitle.trim() : undefined
    const matchedMilestone = findMilestoneByTitle(milestones, milestoneTitle)

    suggestions.push({
      id: `llm-${index}-${normalizedTitle.replace(/[^a-z0-9]+/g, '-')}`,
      goalId: goal.id,
      milestoneId: matchedMilestone?.id,
      milestoneTitle: matchedMilestone?.title || milestoneTitle,
      title: rawTitle,
      description: typeof raw.description === 'string' ? raw.description.trim() || undefined : undefined,
      dueDate,
      priority,
      column: VALID_COLUMNS.has(options.column) ? options.column : 'todo',
      accepted: true,
      template: TEMPLATE_CYCLE[index % TEMPLATE_CYCLE.length],
      planHash,
    })

    seenTitles.add(normalizedTitle)
  }

  return suggestions
}

function buildPrompt(params: LLMPlanParams) {
  const { goal, milestones, options, existingTaskTitles } = params

  return [
    'Create actionable task suggestions for this goal plan.',
    'Return ONLY a JSON object with shape: {"suggestions":[{"title":"...","description":"...","priority":"low|medium|high|urgent","dueDate":"YYYY-MM-DD","milestoneTitle":"..."}]}.',
    'Constraints:',
    '- Max tasks must be <= requested maxTasks.',
    '- Avoid generic phrasing like "Break down" or "Take first step".',
    '- Use concrete verbs and specific outcomes tied to the goal context.',
    '- Keep titles under 100 chars and descriptions under 220 chars.',
    '- Use due dates inside the planning horizon.',
    '',
    JSON.stringify({
      goal,
      milestones,
      options,
      existingTaskTitles,
    }),
  ].join('\n')
}

export async function generateGoalTaskSuggestionsFromLLM(
  params: LLMPlanParams,
  preference?: GoalPlannerPreference
): Promise<LLMPlanResult | null> {
  const provider = resolveProvider(preference)
  if (provider === 'rules') {
    return null
  }

  const prompt = buildPrompt(params)
  const preferredModel = sanitizeModel(preference?.model)
  const preferredBaseUrl = sanitizeBaseUrl(preference?.baseUrl)
  const preferredApiKey = sanitizeApiKey(preference?.apiKey)

  try {
    const response = await complete(
      {
        provider: provider as AIProvider,
        model: preferredModel || undefined,
        baseUrl: preferredBaseUrl || undefined,
        apiKey: preferredApiKey || undefined,
        timeoutMs: Number(process.env.GOAL_PLANNER_TIMEOUT_MS || 20000),
      },
      {
        system: 'You are a strict JSON planner for productivity goals. Return valid JSON only.',
        prompt,
        model: preferredModel || '',
        temperature: provider === 'ollama' ? 0.2 : 0.25,
        jsonMode: provider === 'openai' || provider === 'openai-compatible',
        jsonSchema: provider === 'ollama' ? OLLAMA_JSON_SCHEMA : undefined,
      }
    )

    const rawSuggestions = parseRawSuggestions(response.text)
    const suggestions = mapRawSuggestions(params, rawSuggestions)
    if (suggestions.length === 0) return null

    return {
      suggestions,
      provider,
    }
  } catch (error) {
    console.error('LLM planner failed; falling back to rules planner:', error)
    return null
  }
}
