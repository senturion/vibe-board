import type { AICompletionRequest, AICompletionResponse, AIProviderConfig } from '../types'
import { postJson, stripTrailingSlash } from '../http'

export async function completeOpenAI(
  config: AIProviderConfig,
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const payload = {
    model: config.model,
    temperature: request.temperature ?? 0.25,
    ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
    ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.prompt },
    ],
  }

  const response = await postJson(
    `${stripTrailingSlash(config.baseUrl)}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: request.signal,
    },
    config.timeoutMs
  )

  const text = (response as {
    choices?: Array<{ message?: { content?: string } }>
  })?.choices?.[0]?.message?.content ?? ''

  return { text, provider: config.provider }
}
