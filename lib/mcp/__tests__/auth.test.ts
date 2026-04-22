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
