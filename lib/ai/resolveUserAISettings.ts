import type { AIProvider } from './types'

export interface ResolvedAISettings {
  provider: AIProvider
  model?: string
  baseUrl?: string
  apiKey?: string
}

type GoalPlannerProvider = AIProvider | 'rules'

const VALID_AI_PROVIDERS = new Set<string>(['openai', 'openai-compatible', 'ollama', 'anthropic'])

/** Parse AI settings stored in user_settings.app_settings JSONB */
export function parseStoredAISettings(
  appSettings: unknown
): { provider?: GoalPlannerProvider; model?: string; baseUrl?: string; apiKey?: string } {
  if (!appSettings || typeof appSettings !== 'object' || Array.isArray(appSettings)) {
    return {}
  }

  const s = appSettings as Record<string, unknown>

  const rawProvider = typeof s.aiProvider === 'string'
    ? s.aiProvider.trim()
    : typeof s.goalPlannerProvider === 'string'
      ? s.goalPlannerProvider.trim()
      : ''

  const rawModel = typeof s.aiModel === 'string'
    ? s.aiModel.trim().slice(0, 120)
    : typeof s.goalPlannerModel === 'string'
      ? s.goalPlannerModel.trim().slice(0, 120)
      : ''

  const rawBaseUrl = typeof s.aiApiBaseUrl === 'string'
    ? s.aiApiBaseUrl.trim().slice(0, 240)
    : ''

  const rawApiKey = typeof s.aiApiKey === 'string'
    ? s.aiApiKey.trim().slice(0, 500)
    : ''

  const provider = (rawProvider === 'rules' || VALID_AI_PROVIDERS.has(rawProvider))
    ? rawProvider as GoalPlannerProvider
    : undefined

  return {
    provider,
    model: rawModel || undefined,
    baseUrl: rawBaseUrl || undefined,
    apiKey: rawApiKey || undefined,
  }
}

/** Sanitize AI settings from a request body */
export function parseRequestOverrides(
  value: unknown
): { provider?: GoalPlannerProvider; model?: string; baseUrl?: string; apiKey?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const p = value as Record<string, unknown>

  const provider = (
    typeof p.provider === 'string' &&
    (p.provider === 'rules' || VALID_AI_PROVIDERS.has(p.provider))
  ) ? p.provider as GoalPlannerProvider : undefined

  const model = typeof p.model === 'string' ? p.model.trim().slice(0, 120) : undefined
  const baseUrl = typeof p.baseUrl === 'string' ? p.baseUrl.trim().slice(0, 240) : undefined
  const apiKey = typeof p.apiKey === 'string' ? p.apiKey.trim().slice(0, 500) : undefined

  return {
    provider,
    model: model || undefined,
    baseUrl: baseUrl || undefined,
    apiKey: apiKey || undefined,
  }
}

/** Merge stored + request overrides. Returns null when provider is 'rules'. */
export function mergeAISettings(
  stored: ReturnType<typeof parseStoredAISettings>,
  overrides: ReturnType<typeof parseRequestOverrides>
): ResolvedAISettings | null {
  const merged = { ...stored, ...overrides }
  const provider = merged.provider || 'rules'

  if (provider === 'rules') return null

  return {
    provider: provider as AIProvider,
    model: merged.model,
    baseUrl: merged.baseUrl,
    apiKey: merged.apiKey,
  }
}
