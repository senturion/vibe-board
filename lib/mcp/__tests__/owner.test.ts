import { describe, it, expect, afterEach } from 'vitest'
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
