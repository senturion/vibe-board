-- =====================================================
-- MCP OAUTH 2.1
-- =====================================================

create table public.mcp_oauth_clients (
  client_id text primary key,
  client_secret_hash text,
  client_name text,
  redirect_uris text[] not null,
  grant_types text[] not null default array['authorization_code','refresh_token'],
  token_endpoint_auth_method text not null default 'none',
  created_at timestamptz default now() not null
);

create table public.mcp_oauth_codes (
  code text primary key,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  resource text,
  scopes text[],
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index mcp_oauth_codes_expires_at_idx on public.mcp_oauth_codes (expires_at);

create table public.mcp_oauth_tokens (
  access_token text primary key,
  refresh_token text unique,
  client_id text not null references public.mcp_oauth_clients(client_id) on delete cascade,
  user_id uuid not null,
  resource text,
  scopes text[],
  expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now() not null
);

create index mcp_oauth_tokens_refresh_idx on public.mcp_oauth_tokens (refresh_token) where refresh_token is not null;
create index mcp_oauth_tokens_user_id_idx on public.mcp_oauth_tokens (user_id);

alter table public.mcp_oauth_clients enable row level security;
alter table public.mcp_oauth_codes enable row level security;
alter table public.mcp_oauth_tokens enable row level security;
-- No RLS policies: only the service-role client touches these tables.
