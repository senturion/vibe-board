import { describe, it, expect } from 'vitest'
import { verifyPkceS256 } from '../../oauth/pkce'
import { createHash } from 'node:crypto'

function challengeOf(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

describe('verifyPkceS256', () => {
  it('returns true for matching verifier/challenge pair', () => {
    const verifier = 'a'.repeat(64)
    expect(verifyPkceS256(verifier, challengeOf(verifier))).toBe(true)
  })

  it('returns false for mismatch', () => {
    const v = 'a'.repeat(64)
    expect(verifyPkceS256(v, challengeOf('b'.repeat(64)))).toBe(false)
  })

  it('returns false for an empty verifier', () => {
    expect(verifyPkceS256('', challengeOf('x'))).toBe(false)
  })

  it('returns false for a verifier shorter than 43 chars (spec minimum)', () => {
    const short = 'a'.repeat(42)
    expect(verifyPkceS256(short, challengeOf(short))).toBe(false)
  })

  it('returns false for a verifier longer than 128 chars (spec maximum)', () => {
    const long = 'a'.repeat(129)
    expect(verifyPkceS256(long, challengeOf(long))).toBe(false)
  })
})
