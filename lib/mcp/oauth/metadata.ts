export function buildProtectedResourceMetadata(base: string) {
  const root = base.replace(/\/$/, '')
  return {
    resource: `${root}/api/mcp`,
    authorization_servers: [root],
    bearer_methods_supported: ['header'],
    scopes_supported: [] as string[],
  }
}
