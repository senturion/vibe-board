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

type PlannerProvider = 'rules' | 'openai' | 'openai-compatible' | 'ollama'

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

interface ProviderConfig {
  provider: PlannerProvider
  model: string
  timeoutMs: number
  openaiBaseUrl?: string
  openaiApiKey?: string
  compatBaseUrl?: string
  compatApiKey?: string
  ollamaBaseUrl?: string
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
  if (raw === 'openai' || raw === 'openai-compatible' || raw === 'ollama' || raw === 'rules') {
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

function getConfig(preference?: GoalPlannerPreference): ProviderConfig {
  const preferredProvider = sanitizeProvider(preference?.provider)
  const rawProvider = (preferredProvider || process.env.GOAL_PLANNER_PROVIDER || 'rules').trim().toLowerCase()
  const provider: PlannerProvider = (
    rawProvider === 'openai' ||
    rawProvider === 'openai-compatible' ||
    rawProvider === 'ollama'
  ) ? rawProvider : 'rules'

  const preferredModel = sanitizeModel(preference?.model)
  const preferredBaseUrl = sanitizeBaseUrl(preference?.baseUrl)
  const preferredApiKey = sanitizeApiKey(preference?.apiKey)
  return {
    provider,
    model: preferredModel || process.env.GOAL_PLANNER_MODEL || process.env.OLLAMA_MODEL || 'gpt-4.1-mini',
    timeoutMs: Number(process.env.GOAL_PLANNER_TIMEOUT_MS || 20000),
    openaiBaseUrl: preferredBaseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiApiKey: preferredApiKey || process.env.OPENAI_API_KEY,
    compatBaseUrl: preferredBaseUrl || process.env.GOAL_PLANNER_API_URL,
    compatApiKey: preferredApiKey || process.env.GOAL_PLANNER_API_KEY,
    ollamaBaseUrl: preferredBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  }
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeout),
  }
}

async function postJson(url: string, init: RequestInit, timeoutMs: number) {
  const timeout = withTimeout(init.signal ?? undefined, timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: timeout.signal,
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`Planner provider request failed (${response.status}): ${text.slice(0, 300)}`)
    }

    if (!text) return null
    return JSON.parse(text)
  } finally {
    timeout.cancel()
  }
}

function extractJsonString(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) return fenced[1].trim()

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed
    }

    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1)
    }

    return ''
  }

  if (Array.isArray(value)) {
    return value.map(item => extractJsonString(item)).join('\n').trim()
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.text === 'string') return extractJsonString(record.text)
    if (typeof record.content === 'string') return extractJsonString(record.content)
    if (record.message) return extractJsonString(record.message)
  }

  return ''
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

async function callOpenAIChatApi(config: ProviderConfig, prompt: string, baseUrl: string, apiKey?: string) {
  const payload = {
    model: config.model,
    temperature: 0.25,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a strict JSON planner for productivity goals. Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  }

  const response = await postJson(
    `${stripTrailingSlash(baseUrl)}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    },
    config.timeoutMs
  )

  const messageContent = (response as {
    choices?: Array<{ message?: { content?: unknown } }>
  })?.choices?.[0]?.message?.content

  if (!messageContent) return []
  return parseRawSuggestions(messageContent)
}

async function callOllama(config: ProviderConfig, prompt: string, baseUrl: string) {
  const payload = {
    model: config.model,
    stream: false,
    format: {
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
    },
    options: {
      temperature: 0.2,
    },
    messages: [
      {
        role: 'system',
        content: 'You are a strict JSON planner for productivity goals. Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  }

  const response = await postJson(
    `${stripTrailingSlash(baseUrl)}/api/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    config.timeoutMs
  )

  const content = (response as {
    message?: { content?: unknown }
  })?.message?.content

  if (!content) return []
  return parseRawSuggestions(content)
}

function getOllamaBaseUrlCandidates(baseUrl: string) {
  const primary = stripTrailingSlash(baseUrl || 'http://localhost:11434')
  const candidates: string[] = [primary]
  const fallbacks = ['http://localhost:11434', 'http://127.0.0.1:11434', 'http://[::1]:11434']

  for (const candidate of fallbacks) {
    const normalized = stripTrailingSlash(candidate)
    if (!candidates.includes(normalized)) {
      candidates.push(normalized)
    }
  }

  return candidates
}

export async function generateGoalTaskSuggestionsFromLLM(
  params: LLMPlanParams,
  preference?: GoalPlannerPreference
): Promise<LLMPlanResult | null> {
  const config = getConfig(preference)
  if (config.provider === 'rules') {
    return null
  }

  const prompt = buildPrompt(params)

  try {
    let rawSuggestions: RawSuggestion[] = []

    if (config.provider === 'openai') {
      if (!config.openaiApiKey) return null
      rawSuggestions = await callOpenAIChatApi(config, prompt, config.openaiBaseUrl || 'https://api.openai.com/v1', config.openaiApiKey)
    }

    if (config.provider === 'openai-compatible') {
      if (!config.compatBaseUrl) return null
      const apiKey = config.compatApiKey || process.env.OPENAI_API_KEY || ''
      rawSuggestions = await callOpenAIChatApi(config, prompt, config.compatBaseUrl, apiKey)
    }

    if (config.provider === 'ollama') {
      const candidates = getOllamaBaseUrlCandidates(config.ollamaBaseUrl || 'http://localhost:11434')
      let lastError: unknown = null

      for (const baseUrl of candidates) {
        try {
          rawSuggestions = await callOllama(config, prompt, baseUrl)
          if (rawSuggestions.length > 0) break
        } catch (error) {
          lastError = error
        }
      }

      if (rawSuggestions.length === 0 && lastError) {
        throw lastError
      }
    }

    const suggestions = mapRawSuggestions(params, rawSuggestions)
    if (suggestions.length === 0) return null

    return {
      suggestions,
      provider: config.provider,
    }
  } catch (error) {
    console.error('LLM planner failed; falling back to rules planner:', error)
    return null
  }
}
