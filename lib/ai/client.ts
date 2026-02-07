import type { AIProvider, AICompletionRequest, AICompletionResponse, AIProviderConfig } from './types'
import { stripTrailingSlash } from './http'
import { completeOpenAI } from './providers/openai'
import { completeAnthropic } from './providers/anthropic'
import { completeOllama } from './providers/ollama'

interface ResolveOptions {
  provider?: AIProvider | string
  model?: string
  baseUrl?: string
  apiKey?: string
  timeoutMs?: number
}

const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; baseUrl: string; envKey: string; envBaseUrl: string }> = {
  openai: {
    model: 'gpt-4.1-mini',
    baseUrl: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    envBaseUrl: 'OPENAI_BASE_URL',
  },
  'openai-compatible': {
    model: 'gpt-4.1-mini',
    baseUrl: '',
    envKey: 'GOAL_PLANNER_API_KEY',
    envBaseUrl: 'GOAL_PLANNER_API_URL',
  },
  ollama: {
    model: 'llama3.1',
    baseUrl: 'http://localhost:11434',
    envKey: '',
    envBaseUrl: 'OLLAMA_BASE_URL',
  },
  anthropic: {
    model: 'claude-sonnet-4-5-20250929',
    baseUrl: 'https://api.anthropic.com',
    envKey: 'ANTHROPIC_API_KEY',
    envBaseUrl: 'ANTHROPIC_BASE_URL',
  },
}

export function resolveConfig(options: ResolveOptions): AIProviderConfig {
  const provider = (options.provider ?? 'openai') as AIProvider
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.openai

  const envKey = defaults.envKey ? (process.env[defaults.envKey] ?? '') : ''
  const envBaseUrl = defaults.envBaseUrl ? (process.env[defaults.envBaseUrl] ?? '') : ''
  const envModel = process.env.GOAL_PLANNER_MODEL || process.env.OLLAMA_MODEL || ''

  const rawBaseUrl = options.baseUrl || envBaseUrl || defaults.baseUrl
  return {
    provider,
    model: options.model || envModel || defaults.model,
    baseUrl: rawBaseUrl ? stripTrailingSlash(rawBaseUrl) : defaults.baseUrl,
    apiKey: options.apiKey || envKey,
    timeoutMs: options.timeoutMs ?? Number(process.env.GOAL_PLANNER_TIMEOUT_MS || 20000),
  }
}

export async function complete(
  options: ResolveOptions,
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const config = resolveConfig(options)

  switch (config.provider) {
    case 'openai':
    case 'openai-compatible':
      return completeOpenAI(config, request)
    case 'anthropic':
      return completeAnthropic(config, request)
    case 'ollama':
      return completeOllama(config, request)
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
  }
}
