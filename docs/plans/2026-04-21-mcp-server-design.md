# MCP Server for vibe-board — Design

**Date:** 2026-04-21
**Status:** Approved, ready for implementation plan

## Goal

Let Claude (web, desktop, iOS) read and write vibe-board data through chat — no Claude Code, no extra app UI. Example flows:

- "What tasks do I have coming up in the next 3 days?"
- "Add three new tasks to my Work board: …"
- "Did I hit my meditation habit this week?"
- "Log that I worked out today."

## Architecture

A new endpoint at `/api/mcp` in the existing Next.js app speaks the **MCP Streamable HTTP** protocol. Claude.ai's Custom Connectors feature points at that URL with a Bearer token. The handler validates the token, then calls Supabase using the existing service role key, scoped to a single owner user id.

```
[Claude web/desktop/iOS] ──HTTPS+Bearer──▶ [vibe-board /api/mcp on Vercel] ──▶ [Supabase]
```

No new infra. Reuses existing Vercel deployment, env vars, and DB.

## Auth

Single-user app, so the easy route:

- `MCP_BEARER_TOKEN` — long random string. Claude sends it on every request; handler does constant-time compare.
- `MCP_OWNER_USER_ID` — the user's `auth.users.uuid`. Service role bypasses RLS, so we scope every query to this id explicitly.

Bad token → 401. No per-tool authorization beyond that.

## Tools

**Read (8)**

- `list_tasks` — filter by board, status, due date range, labels
- `get_task` — full detail incl. subtasks
- `list_boards` — boards + active board
- `list_todos` — quick sidebar todos
- `get_notes` — sidebar notes content
- `list_habits` — active habits w/ frequency, type, category, current streak
- `get_habit_status` — for a date (default today): which habits are due, which are done
- `list_habit_history` — completions over a date range, optionally for one habit

**Write (7)**

- `create_task` — title, board, due date, priority, labels, description
- `update_task` — change status, due date, priority, etc.
- `complete_task` — shortcut: status=done + completed_at
- `create_todo` — quick sidebar item
- `append_note` — append to notes (safer than overwrite)
- `log_habit_completion` — check off a habit for a date, optional count + note
- `create_habit` — name, frequency, target_count, type, category

**Out of scope for v1:** delete operations, board CRUD, settings changes, habit categories CRUD, archiving, AI-assist endpoints (`/api/goals/plan`, `/api/insights/generate`, etc. — those have their own UX in the app).

## Data flow (per request)

1. Claude sends MCP request to `/api/mcp` with `Authorization: Bearer <MCP_BEARER_TOKEN>`
2. Route handler validates token (constant-time compare). Mismatch → 401.
3. Handler dispatches to the requested tool.
4. Tool calls Supabase service-role client, scoped to `MCP_OWNER_USER_ID`.
5. Result returned to Claude, who incorporates it into the chat response.

## Setup (one-time)

1. Add `MCP_BEARER_TOKEN` and `MCP_OWNER_USER_ID` to `.env.local` and Vercel.
2. Deploy.
3. In Claude.ai → Settings → Connectors → Add custom connector: URL `https://<vibe-board-domain>/api/mcp`, Bearer token. Auto-syncs to desktop and iOS.

**Caveat:** Custom MCP connectors typically require a paid Claude plan (Pro/Team/Enterprise).

## Implementation steps

1. Add deps: `@modelcontextprotocol/sdk`, `zod`.
2. Create `app/api/mcp/route.ts` — Streamable HTTP handler with auth + MCP server.
3. Create `lib/mcp/tools/` — one file per group: `tasks.ts`, `boards.ts`, `todos.ts`, `notes.ts`, `habits.ts`.
4. Add env vars locally and in Vercel.
5. Vitest tests: one happy-path per tool against a mocked Supabase client; one auth test (401 on bad token).
6. Deploy to Vercel.
7. Smoke test from Claude.ai.
8. Update README with connector setup + how to rotate the token.

**Estimated effort:** ~3-4 hours for v1.

## Future (not now)

- OAuth instead of shared secret (if ever shared with others).
- Delete operations and board CRUD.
- Wrap the AI-assist endpoints as MCP tools.
- Per-device tokens with revocation (requires a small `mcp_tokens` table).
