import { describe, it, expect } from 'vitest'
import { randomToken } from '../../oauth/random'

describe('randomToken', () => {
  it('returns a base64url-encoded string of 32 bytes (43 chars no padding)', () => {
    const t = randomToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('returns unique values on each call', () => {
    const set = new Set(Array.from({ length: 100 }, () => randomToken()))
    expect(set.size).toBe(100)
  })

  it('respects custom byte length', () => {
    expect(randomToken(16)).toMatch(/^[A-Za-z0-9_-]{22}$/)
  })
})
