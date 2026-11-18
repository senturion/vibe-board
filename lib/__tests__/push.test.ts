import { describe, it, expect } from 'vitest'
import { subscriptionsToPrune } from '../push'

const ok: PromiseSettledResult<unknown> = { status: 'fulfilled', value: {} }
const fail = (statusCode?: number): PromiseSettledResult<unknown> => ({ status: 'rejected', reason: { statusCode } })

describe('subscriptionsToPrune', () => {
  it('always removes subscriptions the push service says are gone', () => {
    expect(subscriptionsToPrune(['a', 'b', 'c'], [fail(404), fail(410), fail(500)])).toEqual(['a', 'b'])
  })

  it('removes subscriptions made with other keys when another send worked', () => {
    expect(subscriptionsToPrune(['mac', 'old1', 'old2'], [ok, fail(403), fail(401)])).toEqual(['old1', 'old2'])
  })

  it('keeps everything when every send was refused, since then our own keys may be wrong', () => {
    expect(subscriptionsToPrune(['a', 'b'], [fail(403), fail(403)])).toEqual([])
  })

  it('keeps subscriptions that failed for other reasons', () => {
    expect(subscriptionsToPrune(['a', 'b'], [ok, fail(500)])).toEqual([])
    expect(subscriptionsToPrune(['a'], [fail(undefined)])).toEqual([])
  })
})
