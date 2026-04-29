import { createMcpHandler } from 'mcp-handler'

// MCP server with a single ping tool. Real tools added in later tasks.
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
  },
  {},
  { basePath: '/api' },
)
