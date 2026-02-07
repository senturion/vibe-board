import type { AICompletionRequest, AICompletionResponse, AIProviderConfig } from '../types'
import { postJson, stripTrailingSlash } from '../http'

export async function completeAnthropic(
  config: AIProviderConfig,
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  const payload = {
    model: config.model,
    max_tokens: request.maxTokens ?? 4096,
    temperature: request.temperature ?? 0.25,
    system: request.system,
    messages: [
      { role: 'user', content: request.prompt },
    ],
  }

  const response = await postJson(
    `${stripTrailingSlash(config.baseUrl)}/v1/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
      signal: request.signal,
    },
    config.timeoutMs
  )

  const content = (response as {
    content?: Array<{ type: string; text?: string }>
  })?.content

  const text = (content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text!)
    .join('\n')

  return { text, provider: 'anthropic' }
}
