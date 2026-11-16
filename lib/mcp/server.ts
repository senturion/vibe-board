import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOwnerUserId } from './owner'
import { registerTaskTools } from './tools/tasks'
import { registerBoardTools } from './tools/boards'
import { registerTodoTools } from './tools/todos'
import { registerNoteTools } from './tools/notes'
import { registerHabitTools } from './tools/habits'

const deps = {
  getClient: () => createAdminClient(),
  ownerId: () => getOwnerUserId(),
}

type ToolResult = { content: Array<{ type: 'text'; text: string }> }
type ToolHandler = (args: unknown) => Promise<ToolResult>

// MCP server: ping + task tools + board tools + todo tools + note tools + habit tools.
export const mcpHandler = createMcpHandler((server) => {
  // The tool modules describe each tool as (name, description, zod shape,
  // handler). This maps that onto the SDK's registerTool, which takes a full
  // schema object.
  const tools = {
    tool: (
      name: string,
      description: string,
      shape: Record<string, z.ZodTypeAny>,
      handler: ToolHandler,
    ) =>
      server.registerTool(
        name,
        { description, inputSchema: z.object(shape) },
        (args) => handler(args),
      ),
  }

  tools.tool(
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
  registerTaskTools(tools, deps)
  registerBoardTools(tools, deps)
  registerTodoTools(tools, deps)
  registerNoteTools(tools, deps)
  registerHabitTools(tools, deps)
})
