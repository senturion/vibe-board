export function getOwnerUserId(): string {
  const id = process.env.MCP_OWNER_USER_ID
  if (!id) throw new Error('MCP_OWNER_USER_ID is not set')
  return id
}
