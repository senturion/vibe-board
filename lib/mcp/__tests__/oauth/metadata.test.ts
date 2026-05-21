import { describe, it, expect } from 'vitest'
import { buildProtectedResourceMetadata } from '../../oauth/metadata'

describe('buildProtectedResourceMetadata', () => {
  it('returns RFC 9728 shape pointing AS at the same base', () => {
    expect(buildProtectedResourceMetadata('https://app.example.com')).toEqual({
      resource: 'https://app.example.com/api/mcp',
      authorization_servers: ['https://app.example.com'],
      bearer_methods_supported: ['header'],
      scopes_supported: [],
    })
  })

  it('strips trailing slash from base', () => {
    expect(buildProtectedResourceMetadata('https://app.example.com/').resource)
      .toBe('https://app.example.com/api/mcp')
  })
})
