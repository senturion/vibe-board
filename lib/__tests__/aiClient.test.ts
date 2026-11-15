import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveConfig } from '../ai/client'

describe('resolveConfig — server key handling', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-server-key'
    delete process.env.OPENAI_BASE_URL
  })

  afterEach(() => {
    process.env = { ...saved }
  })

  it('uses the server key with the default endpoint', () => {
    const config = resolveConfig({ provider: 'openai' })
    expect(config.apiKey).toBe('sk-server-key')
    expect(config.baseUrl).toBe('https://api.openai.com/v1')
  })

  it('never sends the server key to a caller-supplied base URL', () => {
    const config = resolveConfig({ provider: 'openai', baseUrl: 'https://evil.example/v1' })
    expect(config.baseUrl).toBe('https://evil.example/v1')
    expect(config.apiKey).toBe('')
  })

  it('uses the caller key with a caller-supplied base URL', () => {
    const config = resolveConfig({
      provider: 'openai',
      baseUrl: 'https://my-proxy.example/v1',
      apiKey: 'sk-mine',
    })
    expect(config.apiKey).toBe('sk-mine')
  })
})
