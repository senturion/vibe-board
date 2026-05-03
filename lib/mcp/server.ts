import { createMcpHandler } from 'mcp-handler'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOwnerUserId } from './owner'
import { registerTaskTools } from './tools/tasks'
import { registerBoardTools } from './tools/boards'
import { registerTodoTools } from './tools/todos'
import { registerNoteTools } from './tools/notes'

const deps = {
  getClient: () => createAdminClient(),
  ownerId: () => getOwnerUserId(),
}

// MCP server: ping + task tools + board tools + todo tools + note tools.
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
    registerTodoTools(server, deps)
    registerNoteTools(server, deps)
  },
  {},
  { basePath: '/api' },
)
