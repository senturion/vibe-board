import { describe, it, expect } from 'vitest'
import { buildProtectedResourceMetadata, buildAuthorizationServerMetadata } from '../../oauth/metadata'

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

describe('buildAuthorizationServerMetadata', () => {
  it('returns RFC 8414 shape with all OAuth endpoints', () => {
    expect(buildAuthorizationServerMetadata('https://app.example.com')).toEqual({
      issuer: 'https://app.example.com',
      authorization_endpoint: 'https://app.example.com/api/oauth/authorize',
      token_endpoint: 'https://app.example.com/api/oauth/token',
      registration_endpoint: 'https://app.example.com/api/oauth/register',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: [],
    })
  })

  it('strips trailing slash from base', () => {
    expect(buildAuthorizationServerMetadata('https://app.example.com/').issuer)
      .toBe('https://app.example.com')
  })
})
