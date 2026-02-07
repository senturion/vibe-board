export function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

export function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
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

export async function postJson(url: string, init: RequestInit, timeoutMs: number) {
  const timeout = withTimeout(init.signal ?? undefined, timeoutMs)
  try {
    const response = await fetch(url, {
      ...init,
      signal: timeout.signal,
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`AI provider request failed (${response.status}): ${text.slice(0, 300)}`)
    }

    if (!text) return null
    return JSON.parse(text)
  } finally {
    timeout.cancel()
  }
}
