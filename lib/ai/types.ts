export type AIProvider = 'openai' | 'openai-compatible' | 'ollama' | 'anthropic'

export interface AICompletionRequest {
  system: string
  prompt: string
  model: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  jsonSchema?: Record<string, unknown>
  signal?: AbortSignal
}

export interface AICompletionResponse {
  text: string
  provider: AIProvider
}

export interface AIProviderConfig {
  provider: AIProvider
  model: string
  baseUrl: string
  apiKey: string
  timeoutMs: number
}
