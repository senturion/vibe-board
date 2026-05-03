import { createMcpHandler } from 'mcp-handler'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOwnerUserId } from './owner'
import { registerTaskTools } from './tools/tasks'
import { registerBoardTools } from './tools/boards'

const deps = {
  getClient: () => createAdminClient(),
  ownerId: () => getOwnerUserId(),
}

// MCP server: ping + task tools + board tools.
export const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      'ping',
      'Health check — returns ok with the current server time.',
      {},
      async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: true, now: new Date().toISOString() }),
          },
        ],
      }),
    )
    registerTaskTools(server, deps)
    registerBoardTools(server, deps)
  },
  {},
  { basePath: '/api' },
)
