import type { AICompletionRequest, AICompletionResponse, AIProviderConfig } from '../types'
import { postJson, stripTrailingSlash } from '../http'

export function getOllamaBaseUrlCandidates(baseUrl: string) {
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

export async function completeOllama(
  config: AIProviderConfig,
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const candidates = getOllamaBaseUrlCandidates(config.baseUrl)
  let lastError: unknown = null

  for (const baseUrl of candidates) {
    try {
      const payload = {
        model: config.model,
        stream: false,
        ...(request.jsonSchema ? { format: request.jsonSchema } : {}),
        options: {
          temperature: request.temperature ?? 0.2,
        },
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
      }

      const response = await postJson(
        `${stripTrailingSlash(baseUrl)}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: request.signal,
        },
        config.timeoutMs
      )

      const text = (response as {
        message?: { content?: string }
      })?.message?.content ?? ''

      if (text) {
        return { text, provider: 'ollama' }
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) throw lastError
  return { text: '', provider: 'ollama' }
}
