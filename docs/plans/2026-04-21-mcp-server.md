# MCP Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/api/mcp` endpoint to vibe-board that lets Claude (web/desktop/iOS) read and write boards, tasks, todos, notes, and habits via a custom MCP connector.

**Architecture:** A single Next.js Route Handler at `app/api/mcp/route.ts` runs an MCP server (via the `mcp-handler` Vercel helper, which wraps `@modelcontextprotocol/sdk`'s Streamable HTTP transport). Bearer-token auth gates the endpoint. Tools call Supabase using the existing `createAdminClient()` (service role), scoped to a single `MCP_OWNER_USER_ID` env var. No new infra; deploys with the existing Vercel project.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@modelcontextprotocol/sdk`, `mcp-handler`, `zod`, Supabase JS, Vitest.

**Design doc:** [`2026-04-21-mcp-server-design.md`](./2026-04-21-mcp-server-design.md)

---

## Phase 1 — Foundation

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install**

```bash
cd "/Users/spencer/project management/vibe-board"
npm install mcp-handler @modelcontextprotocol/sdk zod
```

**Step 2: Verify**

```bash
npm ls mcp-handler @modelcontextprotocol/sdk zod
```
Expected: each package listed with a version, no `UNMET DEPENDENCY` errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mcp-handler, @modelcontextprotocol/sdk, zod for MCP server"
```

---

### Task 2: Add env var scaffolding

**Files:**
- Modify: `.env.example`
- Modify: `.env.local` (do NOT commit)

**Step 1: Update `.env.example`**

Append to `.env.example`:

```
# MCP server (for Claude custom connector)
MCP_BEARER_TOKEN=generate-with-openssl-rand-base64-48
MCP_OWNER_USER_ID=your-auth-users-uuid
```

**Step 2: Generate a real token and write `.env.local`**

```bash
openssl rand -base64 48
```

Paste the output as `MCP_BEARER_TOKEN` in `.env.local`. Look up your `auth.users.uuid` in Supabase Dashboard → Authentication → Users and paste it as `MCP_OWNER_USER_ID`.

**Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: document MCP_BEARER_TOKEN and MCP_OWNER_USER_ID env vars"
```

---

### Task 3: Bearer token auth helper (TDD)

**Files:**
- Create: `lib/mcp/auth.ts`
- Create: `lib/mcp/__tests__/auth.test.ts`

**Step 1: Write failing test**

Create `lib/mcp/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAuthorized } from '../auth'

describe('isAuthorized', () => {
  const ORIGINAL = process.env.MCP_BEARER_TOKEN

  beforeEach(() => {
    process.env.MCP_BEARER_TOKEN = 'secret-token'
  })

  afterEach(() => {
    process.env.MCP_BEARER_TOKEN = ORIGINAL
  })

  it('returns true for matching Bearer token', () => {
    const req = new Request('https://example.com/api/mcp', {
      headers: { Authorization: 'Bearer secret-token' },
    })
    expect(isAuthorized(req)).toBe(true)
  })

  it('returns false for missing header', () => {
    const req = new Request('https://example.com/api/mcp')
    expect(isAuthorized(req)).toBe(false)
  })

  it('returns false for wrong token', () => {
    const req = new Request('https://example.com/api/mcp', {
      headers: { Authorization: 'Bearer nope' },
    })
    expect(isAuthorized(req)).toBe(false)
  })

  it('returns false when MCP_BEARER_TOKEN is unset', () => {
    delete process.env.MCP_BEARER_TOKEN
    const req = new Request('https://example.com/api/mcp', {
      headers: { Authorization: 'Bearer secret-token' },
    })
    expect(isAuthorized(req)).toBe(false)
  })
})
```

**Step 2: Run — expect fail**

```bash
npx vitest run lib/mcp/__tests__/auth.test.ts
```
Expected: FAIL — `Cannot find module '../auth'`.

**Step 3: Implement**

Create `lib/mcp/auth.ts`:

```typescript
import { timingSafeEqual } from 'node:crypto'

export function isAuthorized(request: Request): boolean {
  const expected = process.env.MCP_BEARER_TOKEN
  if (!expected) return false

  const header = request.headers.get('authorization')
  if (!header) return false

  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return false

  const provided = header.slice(prefix.length)
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
```

**Step 4: Run — expect pass**

```bash
npx vitest run lib/mcp/__tests__/auth.test.ts
```
Expected: PASS, 4 tests.

**Step 5: Commit**

```bash
git add lib/mcp/auth.ts lib/mcp/__tests__/auth.test.ts
git commit -m "feat(mcp): add bearer token auth helper with constant-time compare"
```

---

### Task 4: Owner user id helper

**Files:**
- Create: `lib/mcp/owner.ts`
- Create: `lib/mcp/__tests__/owner.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getOwnerUserId } from '../owner'

describe('getOwnerUserId', () => {
  const ORIGINAL = process.env.MCP_OWNER_USER_ID

  afterEach(() => {
    process.env.MCP_OWNER_USER_ID = ORIGINAL
  })

  it('returns the env value when set', () => {
    process.env.MCP_OWNER_USER_ID = '00000000-0000-0000-0000-000000000001'
    expect(getOwnerUserId()).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('throws when unset', () => {
    delete process.env.MCP_OWNER_USER_ID
    expect(() => getOwnerUserId()).toThrow(/MCP_OWNER_USER_ID/)
  })
})
```

**Step 2: Run — expect fail**

```bash
npx vitest run lib/mcp/__tests__/owner.test.ts
```

**Step 3: Implement**

Create `lib/mcp/owner.ts`:

```typescript
export function getOwnerUserId(): string {
  const id = process.env.MCP_OWNER_USER_ID
  if (!id) throw new Error('MCP_OWNER_USER_ID is not set')
  return id
}
```

**Step 4: Run — expect pass**

```bash
npx vitest run lib/mcp/__tests__/owner.test.ts
```

**Step 5: Commit**

```bash
git add lib/mcp/owner.ts lib/mcp/__tests__/owner.test.ts
git commit -m "feat(mcp): add owner user id env accessor"
```

---

### Task 5: MCP route handler skeleton with one ping tool

This task wires `/api/mcp` end-to-end with a trivial `ping` tool, so we can validate auth + transport before adding real tools.

**Files:**
- Create: `app/api/mcp/route.ts`
- Create: `lib/mcp/server.ts`

**Step 1: Implement server factory**

Create `lib/mcp/server.ts`:

```typescript
import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'

export const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      'ping',
      'Health check — returns ok with the current server time.',
      {},
      async () => ({
        content: [
          { type: 'text', text: JSON.stringify({ ok: true, now: new Date().toISOString() }) },
        ],
      }),
    )
  },
  {},
  { basePath: '/api' },
)

export const _internal = { z } // silence unused-import lint until real tools land
```

**Step 2: Wire route**

Create `app/api/mcp/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/mcp/auth'
import { mcpHandler } from '@/lib/mcp/server'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function guarded(request: Request) {
  if (!isAuthorized(request)) return unauthorized()
  return mcpHandler(request)
}

export const GET = guarded
export const POST = guarded
export const DELETE = guarded
```

**Step 3: Manual smoke test**

In one terminal, start the dev server (skip if already running):

```bash
npm run dev
```

In another:

```bash
# 401 path
curl -i http://localhost:3000/api/mcp -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
# Expected: HTTP/1.1 401

# 200 path (replace TOKEN)
TOKEN="$(grep MCP_BEARER_TOKEN .env.local | cut -d= -f2-)"
curl -i http://localhost:3000/api/mcp -X POST \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
# Expected: HTTP/1.1 200 with SSE stream containing serverInfo
```

If the second curl returns 200 with a payload referencing `serverInfo`, transport works.

**Step 4: Commit**

```bash
git add app/api/mcp/route.ts lib/mcp/server.ts
git commit -m "feat(mcp): scaffold /api/mcp with bearer auth and ping tool"
```

---

## Phase 2 — Tools

> **Pattern for every tool task below:** add the tool to `lib/mcp/server.ts` (each tool group lives in its own helper file), then add a Vitest test that mocks `createAdminClient` and asserts the tool returns the expected shape. Commit per group.

### Task 6: Tasks tools (list, get, create, update, complete)

**Files:**
- Create: `lib/mcp/tools/tasks.ts`
- Create: `lib/mcp/__tests__/tools/tasks.test.ts`
- Modify: `lib/mcp/server.ts`

**Step 1: Define tool registrations**

Create `lib/mcp/tools/tasks.ts`. Export a `registerTaskTools(server, deps)` function where `deps` is `{ getClient: () => SupabaseClient<Database>, ownerId: () => string }` (this seam makes mocking easy). Tools to register:

- `list_tasks` — input: `{ board_id?: string, status?: string, due_before?: string (ISO), due_after?: string (ISO), labels?: string[] }`. Query `tasks` filtered by `user_id=ownerId()` plus provided filters; return up to 100 rows ordered by `due_date asc nulls last, "order" asc`.
- `get_task` — input: `{ id: string }`. Single row by id+user_id.
- `create_task` — input: `{ board_id: string, title: string, description?: string, status?: string, priority?: string, labels?: string[], due_date?: string }`. Insert with `user_id=ownerId()`; return the created row.
- `update_task` — input: `{ id: string, patch: { title?, description?, status?, priority?, labels?, due_date?, "order"? } }`. Update where id+user_id match; set `updated_at=now()`.
- `complete_task` — input: `{ id: string }`. Update `status='done', completed_at=now(), updated_at=now()` where id+user_id match.

Each tool returns `{ content: [{ type: 'text', text: JSON.stringify(rowOrRows) }] }`.

Use `zod` schemas for input. Reference `Database['public']['Tables']['tasks']` for column names.

**Step 2: Write failing tests**

Create `lib/mcp/__tests__/tools/tasks.test.ts`. For each tool, assert:
- Call invokes Supabase with the right table, filters, and `user_id=OWNER`.
- Tool result `content[0].text` parses to expected JSON shape.

Use a hand-rolled fake client like:

```typescript
function fakeClient(rowsByTable: Record<string, unknown[]>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []
  const builder = (table: string) => {
    const chain: any = {}
    const record = (method: string, ...args: unknown[]) => {
      calls.push({ table, method, args })
      return chain
    }
    chain.select = (...a: unknown[]) => record('select', ...a)
    chain.insert = (...a: unknown[]) => record('insert', ...a)
    chain.update = (...a: unknown[]) => record('update', ...a)
    chain.eq = (...a: unknown[]) => record('eq', ...a)
    chain.in = (...a: unknown[]) => record('in', ...a)
    chain.contains = (...a: unknown[]) => record('contains', ...a)
    chain.gte = (...a: unknown[]) => record('gte', ...a)
    chain.lte = (...a: unknown[]) => record('lte', ...a)
    chain.order = (...a: unknown[]) => record('order', ...a)
    chain.limit = (...a: unknown[]) => record('limit', ...a)
    chain.single = () => Promise.resolve({ data: rowsByTable[table]?.[0] ?? null, error: null })
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rowsByTable[table] ?? [], error: null }).then(resolve)
    return chain
  }
  return { from: builder, _calls: calls }
}
```

Drive each tool through its `execute`-style function (export the per-tool functions from `tasks.ts` so tests don't need a full MCP server in-process).

**Step 3: Run — expect fail, then implement**

```bash
npx vitest run lib/mcp/__tests__/tools/tasks.test.ts
```

Implement until green.

**Step 4: Wire into server**

Modify `lib/mcp/server.ts`:

```typescript
import { createMcpHandler } from 'mcp-handler'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOwnerUserId } from './owner'
import { registerTaskTools } from './tools/tasks'

const deps = {
  getClient: () => createAdminClient(),
  ownerId: () => getOwnerUserId(),
}

export const mcpHandler = createMcpHandler(
  (server) => {
    server.tool('ping', 'Health check.', {}, async () => ({
      content: [{ type: 'text', text: JSON.stringify({ ok: true, now: new Date().toISOString() }) }],
    }))
    registerTaskTools(server, deps)
  },
  {},
  { basePath: '/api' },
)
```

**Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all green.

**Step 6: Commit**

```bash
git add lib/mcp/tools/tasks.ts lib/mcp/__tests__/tools/tasks.test.ts lib/mcp/server.ts
git commit -m "feat(mcp): add task tools (list, get, create, update, complete)"
```

---

### Task 7: Boards tool (list_boards)

**Files:**
- Create: `lib/mcp/tools/boards.ts`
- Create: `lib/mcp/__tests__/tools/boards.test.ts`
- Modify: `lib/mcp/server.ts`

**Step 1:** Define `registerBoardTools` exposing one tool, `list_boards`, no input. Returns all boards for owner ordered by `created_at asc`. Joins/looks up active board id from `user_settings` and includes `is_active: boolean` on each row.

**Step 2:** Write failing tests using the same fake client pattern. Assert call to `boards` table filtered by `user_id`, and call to `user_settings` to read `active_board_id`.

**Step 3:** Implement. **Step 4:** Wire into `server.ts`. **Step 5:** `npx vitest run` — green.

**Step 6: Commit**

```bash
git add lib/mcp/tools/boards.ts lib/mcp/__tests__/tools/boards.test.ts lib/mcp/server.ts
git commit -m "feat(mcp): add list_boards tool"
```

---

### Task 8: Todos tools (list_todos, create_todo)

**Files:**
- Create: `lib/mcp/tools/todos.ts`
- Create: `lib/mcp/__tests__/tools/todos.test.ts`
- Modify: `lib/mcp/server.ts`

- `list_todos` — input: `{ include_completed?: boolean }` (default false). Filter `user_id=owner`, optionally `completed=false`, order `created_at desc`, limit 100.
- `create_todo` — input: `{ text: string }`. Insert with `user_id=owner, completed=false`.

Same TDD flow + commit.

```bash
git commit -m "feat(mcp): add todo tools (list, create)"
```

---

### Task 9: Notes tools (get_notes, append_note)

**Files:**
- Create: `lib/mcp/tools/notes.ts`
- Create: `lib/mcp/__tests__/tools/notes.test.ts`
- Modify: `lib/mcp/server.ts`

- `get_notes` — no input. Read the single `notes` row for owner. Return `{ content, updated_at }` or `{ content: '', updated_at: null }` if none.
- `append_note` — input: `{ text: string, separator?: string }` (default `'\n\n'`). Read existing content, concat `existing + separator + text`, upsert (insert if missing, update otherwise) with `updated_at=now()`. Return the new full content.

Same TDD flow + commit.

```bash
git commit -m "feat(mcp): add notes tools (get, append)"
```

---

### Task 10: Habit tools (5 tools)

**Files:**
- Create: `lib/mcp/tools/habits.ts`
- Create: `lib/mcp/__tests__/tools/habits.test.ts`
- Modify: `lib/mcp/server.ts`

- `list_habits` — input: `{ include_archived?: boolean }` (default false). Returns active habits joined with `habit_streaks` (current_streak, best_streak) and category name/color. Order by `"order" asc`.
- `get_habit_status` — input: `{ date?: string }` (default today, YYYY-MM-DD in server local time). For each active habit due on that date (per `frequency_type` / `specific_days`), return `{ habit_id, name, target_count, completions_today: number, done: boolean }`.
- `list_habit_history` — input: `{ habit_id?: string, from: string (YYYY-MM-DD), to: string (YYYY-MM-DD) }`. Returns rows from `habit_completions` filtered by user, optional habit, and date range, ordered ascending.
- `log_habit_completion` — input: `{ habit_id: string, date?: string, count?: number, note?: string }`. Insert into `habit_completions`. Return the new row. (Note: streaks are recalculated by app code/triggers; tool does not maintain `habit_streaks`.)
- `create_habit` — input: `{ name: string, description?: string, frequency_type?: 'daily'|'weekly'|'specific_days', frequency_value?: number, specific_days?: number[], target_count?: number, habit_type?: 'build'|'avoid', category_id?: string }`. Insert with sensible defaults matching the schema.

Same TDD flow + commit.

```bash
git commit -m "feat(mcp): add habit tools (list, status, history, log, create)"
```

---

## Phase 3 — Ship

### Task 11: Add env vars to Vercel

**Step 1:** In Vercel dashboard for the vibe-board project → Settings → Environment Variables, add for **Production** (and Preview if desired):

- `MCP_BEARER_TOKEN` = the value from `.env.local`
- `MCP_OWNER_USER_ID` = the value from `.env.local`

**Step 2:** Verify

```bash
cd "/Users/spencer/project management/vibe-board"
vercel env ls
```
Expected: both names listed for `production`.

No commit (no file changes).

---

### Task 12: Deploy

**Step 1:** Push

```bash
git push
```

**Step 2:** Watch the deploy

```bash
vercel ls --limit 1
```

Wait for `READY`. Capture the production URL — call it `$PROD`.

**Step 3:** Production smoke test

```bash
TOKEN="$(grep MCP_BEARER_TOKEN .env.local | cut -d= -f2-)"
curl -i "$PROD/api/mcp" -X POST \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```
Expected: 200, response body lists all 15 tools.

If 401: env vars not propagated — re-check Vercel and redeploy.
If 500: check `vercel logs $PROD --follow`.

---

### Task 13: Connect from Claude.ai

**Step 1:** Open claude.ai → Settings → Connectors → Add custom connector.

**Step 2:** Enter:
- Name: `vibe-board`
- URL: `$PROD/api/mcp`
- Auth: Bearer token → paste `MCP_BEARER_TOKEN`

**Step 3:** In a Claude chat (web), test each entity:

- "List my boards." → expect `list_boards` to fire.
- "What tasks do I have due in the next 3 days?" → expect `list_tasks` with `due_before` filter.
- "Add a task called 'MCP smoke test' to my [board name]." → expect `create_task`. Verify it appears in the vibe-board UI.
- "What habits am I due for today?" → `get_habit_status`.
- "Log that I did [habit name] today." → `log_habit_completion`. Verify in app.

**Step 4:** Confirm the connector also shows up in the desktop and iOS Claude apps (no extra setup needed; it auto-syncs to your account).

If any tool call errors, check `vercel logs $PROD --follow` for the stack trace.

---

### Task 14: README update

**Files:**
- Modify: `README.md`

**Step 1:** Add a new section under the existing "Goal Planner LLM Providers":

```markdown
## Claude MCP Connector

This app exposes a custom MCP server at `/api/mcp` so Claude (web/desktop/iOS) can read and write your data via chat.

**Required env vars:**

- `MCP_BEARER_TOKEN` — long random string. Generate with `openssl rand -base64 48`.
- `MCP_OWNER_USER_ID` — your `auth.users` UUID (Supabase Dashboard → Authentication → Users).

**Connect from Claude.ai:**

Settings → Connectors → Add custom connector. URL: `https://<your-domain>/api/mcp`. Auth: Bearer token → paste `MCP_BEARER_TOKEN`.

**Rotate the token:**

1. Generate a new value, update `MCP_BEARER_TOKEN` in `.env.local` and Vercel.
2. Redeploy.
3. Re-paste the new token in the Claude connector settings.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Claude MCP connector setup to README"
git push
```

---

## Done criteria

- [ ] All Vitest tests green: `npx vitest run`
- [ ] `tools/list` from production returns 15 tools
- [ ] At least one read tool and one write tool exercised end-to-end from claude.ai
- [ ] Newly created task / logged habit visible in the vibe-board UI
- [ ] README documents env vars + connector setup
