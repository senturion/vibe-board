import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('playBell', () => {
  it('plays two tones through Web Audio', async () => {
    const started: number[] = []
    class FakeContext {
      currentTime = 0
      destination = {}
      resume = vi.fn(async () => {})
      createOscillator() {
        const osc = { type: '', frequency: { value: 0 }, connect: (n: unknown) => n, start: () => started.push(osc.frequency.value), stop: () => {} }
        return osc
      }
      createGain() {
        return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: (n: unknown) => n }
      }
    }
    vi.stubGlobal('AudioContext', FakeContext)
    const { playBell } = await import('../bell')
    playBell(70)
    expect(started).toEqual([880, 1318.5])
  })

  it('does nothing where Web Audio is unavailable', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const { playBell } = await import('../bell')
    expect(() => playBell(70)).not.toThrow()
  })
})
