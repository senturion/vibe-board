# MCP OAuth 2.1 — Design

**Date:** 2026-05-04
**Status:** Approved, ready for implementation plan
**Related:** [`2026-04-21-mcp-server-design.md`](./2026-04-21-mcp-server-design.md) (original MCP build), [`2026-04-21-mcp-server.md`](./2026-04-21-mcp-server.md) (build plan)

## Why

Original MCP server uses a shared bearer token. Confirmed against current Anthropic docs: **claude.ai's custom-connector UI strictly requires OAuth 2.0** (with Dynamic Client Registration). The connector form has OAuth Client ID / Secret fields only — no Bearer field. Our existing server returns 404 to claude.ai's discovery probes, so the connector save fails.

Per MCP Authorization spec [2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization):

- PKCE S256 mandatory
- Resource indicators (RFC 8707) mandatory — tokens bound to resource URL
- AS metadata (RFC 8414) and Protected Resource metadata (RFC 9728) required
- DCR (RFC 7591) recommended; claude.ai uses it

`@modelcontextprotocol/sdk` ships built-in OAuth helpers (`server/auth/*`), but they're Express-based — we'll borrow the `OAuthServerProvider` interface as a contract and write Next.js route handlers ourselves.

## Architecture

Bolt OAuth onto the existing setup. Don't touch the 16 tools. Swap the bearer guard at `/api/mcp` for a token-table lookup. Add 5 new endpoints + a migration.

```
claude.ai
  │ 1. GET /.well-known/oauth-protected-resource    (RFC 9728)
  │ 2. GET /.well-known/oauth-authorization-server  (RFC 8414)
  │ 3. POST /api/oauth/register                     (RFC 7591 DCR)
  │ 4. → user browser → /api/oauth/authorize?…+PKCE
  │
[vibe-board /api/oauth/authorize]
  │ Reads Supabase session.
  │   If user_id == MCP_OWNER_USER_ID → store auth code, redirect to claude.ai with code
  │   Else if no session → redirect to /login?return_to=<this_url>
  │   Else (wrong user) → 403
  │
claude.ai
  │ 5. POST /api/oauth/token (code + code_verifier) → { access_token, refresh_token }
  │ 6. POST /api/mcp w/ Authorization: Bearer <access_token>
  │
[vibe-board /api/mcp]
  │ Look up token in mcp_oauth_tokens, validate expiry + audience.
  │ On 401: emit WWW-Authenticate: Bearer resource_metadata="<base>/.well-known/oauth-protected-resource"
```

## Data model — 3 new Supabase tables

```sql
-- DCR-registered OAuth clients (claude.ai will register itself once)
create table public.mcp_oauth_clients (
  client_id text primary key,
  client_secret_hash text,                 -- nullable; claude.ai is public client w/ PKCE
  client_name text,
  redirect_uris text[] not null,           -- e.g. ['https://claude.ai/api/mcp/auth_callback']
  grant_types text[] not null default array['authorization_code','refresh_token'],
  token_endpoint_auth_method text not null default 'none',
  created_at timestamptz default now() not null
);

-- Short-lived authorization codes (5 min TTL)
create table public.mcp_oauth_codes (
  code text primary key,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,            -- PKCE
  code_challenge_method text not null default 'S256',
  resource text,                           -- RFC 8707 audience
  scopes text[],
  expires_at timestamptz not null,
  consumed_at timestamptz                  -- single-use
);

-- Issued tokens
create table public.mcp_oauth_tokens (
  access_token text primary key,           -- random opaque (32 bytes base64url), not JWT
  refresh_token text unique,               -- random opaque, nullable
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null,                   -- = MCP_OWNER_USER_ID
  resource text,                           -- audience (RFC 8707)
  scopes text[],
  expires_at timestamptz not null,         -- access_token TTL ≈ 1 hr
  refresh_expires_at timestamptz,          -- refresh_token TTL ≈ 30 days
  revoked_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.mcp_oauth_clients enable row level security;
alter table public.mcp_oauth_codes enable row level security;
alter table public.mcp_oauth_tokens enable row level security;
-- No policies. Service-role only — same pattern as the other system-only tables in this app.
```

## Endpoints

| Path | Method | Auth | Behavior |
|---|---|---|---|
| `/.well-known/oauth-protected-resource` | GET | none, CORS | Static JSON: `{ resource, authorization_servers, bearer_methods_supported: ['header'], scopes_supported: [] }` |
| `/.well-known/oauth-authorization-server` | GET | none, CORS | Static JSON: `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `response_types_supported: ['code']`, `grant_types_supported: ['authorization_code','refresh_token']`, `token_endpoint_auth_methods_supported: ['none']`, `code_challenge_methods_supported: ['S256']` |
| `/api/oauth/register` | POST | none | RFC 7591 DCR: accept `{ redirect_uris, client_name, …}`, generate `client_id`, store row, return client info |
| `/api/oauth/authorize` | GET | Supabase session | Validate `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method=S256`, `resource`. If session.user_id matches `MCP_OWNER_USER_ID` → store auth code (5 min TTL), 302 to `redirect_uri?code=…&state=…`. No session → 302 to `/login?return_to=<full authorize URL>`. Wrong user → 403. |
| `/api/oauth/token` | POST | client_id (PKCE proves possession) | Two grant types: `authorization_code` (verify PKCE, consume code, issue tokens) and `refresh_token` (rotate). Return `{ access_token, refresh_token, token_type: 'Bearer', expires_in }` |
| `/api/mcp` (modified) | (per MCP) | OAuth bearer | Replace `isAuthorized()` with token-table lookup. Validate not expired, not revoked, audience matches our resource. On 401 emit `WWW-Authenticate: Bearer resource_metadata="<base>/.well-known/oauth-protected-resource"` |

**Middleware changes:** extend the existing `/api/mcp` exemption to also cover `/.well-known/oauth-*` and `/api/oauth/*` (these are public OAuth endpoints; no Supabase login redirect on them).

**Login page change:** small tweak to honor `?return_to=` query param so the OAuth flow can come back to `/api/oauth/authorize` after sign-in.

## Tokens

- Opaque random strings, 32 bytes base64url. NOT JWTs. Simpler to validate — DB lookup only.
- `access_token` TTL: 1 hour
- `refresh_token` TTL: 30 days. Rotated on every use (old refresh marked revoked, new pair issued).
- Audience binding: every token row stores `resource`. On `/api/mcp` we validate the resource matches our canonical URL.

## Vercel Deployment Protection

Stays ON for the rest of the app. The OAuth + MCP paths must bypass it. Options in priority order:

1. **Vercel "Trusted IPs"** allowing `160.79.104.0/21` (Anthropic's published range) — clean, no token shenanigans
2. **Per-path bypass allowlist** if available in current Vercel UI
3. **Disable protection entirely** — last resort

If we can't get any of those working, we drop protection. Pick at implementation time.

## Testing

- **Unit tests:** ~12 new tests covering random token gen, PKCE S256 verify, code expiry, token expiry/revocation, audience validation, refresh rotation. Vitest, same patterns as existing tool tests.
- **Integration test for `/api/mcp` auth path:** valid token → pass; expired → 401 + WWW-Authenticate; unknown → same.
- **Manual prod smoke:** scripted curl-based OAuth dance (simulating claude.ai) before the real connector touches it.

## Migration & rollout

1. Land new OAuth code + migration
2. Apply Supabase migration to prod DB
3. Deploy to Vercel; verify the curl-based OAuth dance against prod
4. Configure Vercel protection bypass (Trusted IPs preferred)
5. Add the connector in claude.ai → confirm `list_boards` works from chat
6. Optionally remove `MCP_BEARER_TOKEN` and `lib/mcp/auth.ts` (no longer used)

## Out of scope (intentional)

- Refresh token rotation table (we just store both in `mcp_oauth_tokens`)
- Scope-based authorization (no granular scopes — owner gets all 16 tools)
- Token revocation endpoint (claude.ai handles its own logout; we just expire)
- Consent UI screen (single-user, auto-approve based on Supabase session)
- Multi-user support (RLS would need policies; auth would need per-user owner UUID lookup)
- JWKS / signed tokens (opaque + DB lookup is simpler and fine at this scale)
