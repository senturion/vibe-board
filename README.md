# Vibe Board

A personal productivity app: a kanban board with habits, goals, routines, a journal and a focus timer, plus an MCP server so Claude can read and update it from chat.

It is built for one person. There is no signup page, and the MCP server only ever acts for a single configured owner.

## Stack

- Next.js 16 (App Router) and React 19, deployed on Vercel
- Supabase for the database and sign-in, with row-level security on every table
- TanStack Query for tasks, boards and settings
- Tailwind CSS 4
- Installable as a PWA (service worker built by Serwist from `app/sw.ts`); an iOS shell can be built with Capacitor

## Running it locally

```bash
npm install
```

Create `.env.local` with at least the two Supabase values (see the table below), then:

```bash
npm run dev
```

Open http://localhost:3000 and sign in with a user that exists in your Supabase project.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (frees port 3000 first) |
| `npm run build` | Production build |
| `npm test` | Run the test suite once |
| `npm run lint` | Lint |
| `npm run cap:sync` | Build the static export and sync it to the iOS project |

CI runs lint, typecheck, tests and build on every pull request and on `main`.

## Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Everything | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | MCP server, reminders | Server only. Never expose it to the browser |
| `MCP_OWNER_USER_ID` | MCP server | Your `auth.users` UUID. Only this user can approve a connection |
| `MCP_OWNER_TIMEZONE` | MCP server (optional) | IANA name such as `America/Toronto`. Decides what "today" means for habit tools |
| `CRON_SECRET` | Reminders | The reminders endpoint refuses to run without it |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Reminders | Web push keys |
| `GOAL_PLANNER_PROVIDER`, `GOAL_PLANNER_MODEL`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `GOAL_PLANNER_TIMEOUT_MS` | AI features (optional) | Server-side defaults; see below |

Set them in `.env.local` for local work and in the Vercel dashboard for production. A change in Vercel takes effect on the next deployment.

## Database

`supabase-schema.sql` creates the tables and their row-level security policies. Later changes live in `supabase/migrations/` and are applied by running each file in the Supabase SQL Editor:

- `2026-05-04-mcp-oauth.sql` adds the tables the MCP sign-in flow uses.
- `2026-11-15-indexes.sql` adds indexes. It changes no data and is safe to run more than once.

Turn off new signups in Supabase (Authentication → Sign In / Up). The app has no signup page, but the Supabase API would still accept one.

## Claude MCP connector

The app serves an MCP server at `/api/mcp` with 16 tools covering tasks, boards, todos, notes and habits.

To connect from Claude: Settings → Connectors → Add custom connector, with the URL `https://<your-domain>/api/mcp`. Claude registers itself and sends you to a Vibe Board consent page. Sign in if asked, check that the address shown is Claude's, and choose **Allow**. Nothing is granted until you do.

To revoke access, set `revoked_at` on the rows in `mcp_oauth_tokens` (or delete them) in the Supabase dashboard.

Task tools accept a column id as the status (`backlog`, `todo`, `in-progress`, `complete`, or a custom column of that board) and map common names such as `done` onto them. Due dates are `YYYY-MM-DD`.

## Reminders

`/api/notifications/cron` sends the daily reminder push. It returns 500 if `CRON_SECRET` is not set and 401 unless the request carries `Authorization: Bearer <CRON_SECRET>`.

Vercel's free plan runs a cron job only once a day, so `vercel.json` alone cannot send a reminder at the time you pick. To get reminders at your chosen time, run `supabase/reminders-cron.sql` once in the Supabase SQL Editor after filling in your domain and `CRON_SECRET`. It makes Supabase call the endpoint every 15 minutes. Do not commit a copy with the real secret in it.

## AI features

Subtask generation, clarifying questions, the goal planner, journal prompts and insights can use an LLM. Choose the provider, model, base URL and API key in the app under Settings → AI. The API key is kept on your device and sent only with AI requests; it is never saved to the database.

The server environment variables above act as defaults. A server API key is only ever sent to the server's own configured endpoint, never to a base URL supplied by the browser. With the provider set to `rules`, the goal planner uses built-in templates and needs no LLM.

## Backups

The database icon in the top bar opens Backup & Restore. Export downloads everything you have in the app as one JSON file. Restore reads such a file back into your account: rows that still exist are replaced with the backup's version, missing rows are added, and nothing is deleted. Every restored row is assigned to the signed-in account.

## Project layout

| Path | Contents |
| --- | --- |
| `app/` | Pages and API routes (`api/mcp`, `api/oauth`, `api/notifications`, AI routes) |
| `components/` | UI, grouped by feature |
| `hooks/`, `contexts/` | Data access and shared state |
| `lib/mcp/` | MCP tools and the OAuth stores |
| `lib/ai/` | LLM provider clients |
| `supabase/` | Migrations and the reminders schedule |
