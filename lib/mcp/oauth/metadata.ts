export function buildProtectedResourceMetadata(base: string) {
  const root = base.replace(/\/$/, '')
  return {
    resource: `${root}/api/mcp`,
    authorization_servers: [root],
    bearer_methods_supported: ['header'],
    scopes_supported: [] as string[],
  }
}

export function buildAuthorizationServerMetadata(base: string) {
  const root = base.replace(/\/$/, '')
  return {
    issuer: root,
    authorization_endpoint: `${root}/api/oauth/authorize`,
    token_endpoint: `${root}/api/oauth/token`,
    registration_endpoint: `${root}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [] as string[],
  }
}
