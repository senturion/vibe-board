#!/usr/bin/env bash
# oauth-dance.sh — end-to-end OAuth 2.1 + DCR smoke test for vibe-board MCP.
#
# Usage:
#   ./scripts/oauth-dance.sh <BASE_URL> [VERCEL_BYPASS_TOKEN]
#
# Examples:
#   ./scripts/oauth-dance.sh http://localhost:3000
#   ./scripts/oauth-dance.sh https://vibe-board-pink.vercel.app "$VERCEL_BYPASS"
#
# Walks through: discovery, DCR, PKCE generation, authorize (manual browser
# step), token exchange, MCP tools/list, refresh, re-test.

set -euo pipefail

# ---------- args ----------
if [ $# -lt 1 ]; then
  echo "Usage: $0 <BASE_URL> [VERCEL_BYPASS_TOKEN]" >&2
  exit 2
fi
BASE="${1%/}"          # strip trailing slash
BYPASS="${2:-}"
REDIRECT="${BASE}/oauth/callback-helper"
RESOURCE="${BASE}/api/mcp"

# ---------- prereqs ----------
for cmd in curl jq openssl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: required command '$cmd' not found in PATH" >&2
    exit 1
  fi
done

# ---------- helpers ----------
# Append Vercel deployment-protection bypass query params if a token is set.
add_bypass() {
  local url="$1"
  if [ -n "$BYPASS" ]; then
    if [[ "$url" == *"?"* ]]; then
      echo "${url}&x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true"
    else
      echo "${url}?x-vercel-protection-bypass=${BYPASS}&x-vercel-set-bypass-cookie=true"
    fi
  else
    echo "$url"
  fi
}

# urlencode a single value using jq's @uri filter.
urlencode() {
  jq -rn --arg v "$1" '$v|@uri'
}

hr() { echo "----------------------------------------"; }
section() { echo; echo "=== $* ==="; }

# ---------- Step 1: Discovery ----------
section "Step 1: Discovery"

PR_URL="$(add_bypass "${BASE}/.well-known/oauth-protected-resource")"
AS_URL="$(add_bypass "${BASE}/.well-known/oauth-authorization-server")"

echo "GET ${PR_URL}"
PR_BODY="$(curl -sS -f "$PR_URL")"
echo "$PR_BODY" | jq .
hr

echo "GET ${AS_URL}"
AS_BODY="$(curl -sS -f "$AS_URL")"
echo "$AS_BODY" | jq .

# ---------- Step 2: Dynamic Client Registration ----------
section "Step 2: Register client (DCR)"

REG_URL="$(add_bypass "${BASE}/api/oauth/register")"
REG_BODY="$(jq -nc --arg name "oauth-dance.sh" --arg ru "$REDIRECT" \
  '{client_name:$name, redirect_uris:[$ru]}')"

echo "POST ${REG_URL}"
echo "body: ${REG_BODY}"
REG_RES="$(curl -sS -f -X POST "$REG_URL" \
  -H 'Content-Type: application/json' \
  -d "$REG_BODY")"
echo "$REG_RES" | jq .

CLIENT_ID="$(echo "$REG_RES" | jq -r '.client_id')"
if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ]; then
  echo "ERROR: register response missing client_id" >&2
  exit 1
fi
echo "client_id=${CLIENT_ID}"

# ---------- Step 3: PKCE ----------
section "Step 3: Generate PKCE pair"

VERIFIER="$(openssl rand 64 | base64 | tr -d '=\n' | tr '/+' '_-' | head -c 64)"
CHALLENGE="$(printf '%s' "$VERIFIER" | openssl dgst -sha256 -binary | base64 | tr -d '=\n' | tr '/+' '_-')"
echo "code_verifier  (len=${#VERIFIER})  ${VERIFIER}"
echo "code_challenge (len=${#CHALLENGE}) ${CHALLENGE}"

# ---------- Step 4: Build authorize URL ----------
section "Step 4: Build authorize URL"

AUTH_URL="${BASE}/api/oauth/authorize"
AUTH_URL+="?response_type=code"
AUTH_URL+="&client_id=$(urlencode "$CLIENT_ID")"
AUTH_URL+="&redirect_uri=$(urlencode "$REDIRECT")"
AUTH_URL+="&code_challenge=${CHALLENGE}"
AUTH_URL+="&code_challenge_method=S256"
AUTH_URL+="&state=dance123"
AUTH_URL+="&resource=$(urlencode "$RESOURCE")"
AUTH_URL+="&scope="

# Vercel bypass goes onto the URL too (the bypass cookie set on this redirect
# carries through to the callback).
AUTH_URL_FULL="$(add_bypass "$AUTH_URL")"
echo "Open this URL in your browser:"
echo
echo "  $AUTH_URL_FULL"
echo
echo "Sign in to vibe-board if prompted. You'll be redirected to:"
echo "  ${REDIRECT}?code=<code>&state=dance123"
echo "(That page likely 404s — that's fine; we just need the URL from the address bar.)"

# ---------- Step 5: Read code back ----------
section "Step 5: Paste callback URL or code"

read -r -p "Paste the full redirect URL OR just the code, then Enter: " PASTED
if [ -z "${PASTED:-}" ]; then
  echo "No input received — aborting before token exchange." >&2
  exit 0
fi

# Extract code= value if a URL was pasted; otherwise treat input as the raw code.
if [[ "$PASTED" == *"code="* ]]; then
  CODE="${PASTED#*code=}"
  CODE="${CODE%%&*}"
else
  CODE="$PASTED"
fi
echo "code=${CODE}"

# ---------- Step 6: Token exchange ----------
section "Step 6: Token exchange (authorization_code)"

TOKEN_URL="$(add_bypass "${BASE}/api/oauth/token")"
echo "POST ${TOKEN_URL}"
TOKEN_RES="$(curl -sS -f -X POST "$TOKEN_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=${CODE}" \
  --data-urlencode "code_verifier=${VERIFIER}" \
  --data-urlencode "redirect_uri=${REDIRECT}" \
  --data-urlencode "client_id=${CLIENT_ID}" \
  --data-urlencode "resource=${RESOURCE}")"
echo "$TOKEN_RES" | jq .

ACCESS_TOKEN="$(echo "$TOKEN_RES" | jq -r '.access_token')"
REFRESH_TOKEN="$(echo "$TOKEN_RES" | jq -r '.refresh_token')"
if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "ERROR: token response missing access_token" >&2
  exit 1
fi
echo "access_token  (len=${#ACCESS_TOKEN})"
echo "refresh_token (len=${#REFRESH_TOKEN})"

# ---------- Step 7: MCP tools/list ----------
section "Step 7: MCP tools/list"

MCP_URL="$(add_bypass "${BASE}/api/mcp")"
MCP_BODY='{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

call_tools_list() {
  local token="$1"
  echo "POST ${MCP_URL}"
  local raw
  raw="$(curl -sS -f -X POST "$MCP_URL" \
    -H "Authorization: Bearer ${token}" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d "$MCP_BODY")"
  # The streamable-http MCP transport returns a single SSE event:
  #   event: message
  #   data: {...json...}
  # Extract the data: line if present, else assume plain JSON.
  local json
  if echo "$raw" | grep -q '^data: '; then
    json="$(echo "$raw" | sed -n 's/^data: //p' | head -n 1)"
  else
    json="$raw"
  fi
  echo "$json" | jq '{id, result: {tools: [.result.tools[]?.name]}}'
}

call_tools_list "$ACCESS_TOKEN"

# ---------- Step 8: Refresh ----------
section "Step 8: Refresh access token"

if [ -z "$REFRESH_TOKEN" ] || [ "$REFRESH_TOKEN" = "null" ]; then
  echo "No refresh_token returned — skipping steps 8 and 9."
  exit 0
fi

REFRESH_RES="$(curl -sS -f -X POST "$TOKEN_URL" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "refresh_token=${REFRESH_TOKEN}" \
  --data-urlencode "client_id=${CLIENT_ID}")"
echo "$REFRESH_RES" | jq .

NEW_ACCESS_TOKEN="$(echo "$REFRESH_RES" | jq -r '.access_token')"
if [ -z "$NEW_ACCESS_TOKEN" ] || [ "$NEW_ACCESS_TOKEN" = "null" ]; then
  echo "ERROR: refresh response missing access_token" >&2
  exit 1
fi
echo "Refreshed OK. new access_token len=${#NEW_ACCESS_TOKEN}"

# ---------- Step 9: Re-test MCP with refreshed token ----------
section "Step 9: MCP tools/list with refreshed token"
call_tools_list "$NEW_ACCESS_TOKEN"

section "Done"
echo "Full OAuth 2.1 + DCR dance completed successfully against ${BASE}."
