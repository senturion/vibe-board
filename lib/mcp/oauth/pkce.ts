import { createHash, timingSafeEqual } from 'node:crypto'

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (verifier.length < 43 || verifier.length > 128) return false
  const computed = createHash('sha256').update(verifier).digest('base64url')
  const a = Buffer.from(computed)
  const b = Buffer.from(challenge)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
