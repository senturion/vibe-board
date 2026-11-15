import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'

// A Supabase stand-in: every query resolves to "no rows", inserts return a session row.
function fakeSupabase() {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  for (const m of ['select', 'eq', 'gte', 'order', 'update', 'upsert']) chain[m] = self
  chain.insert = () => chain
  chain.maybeSingle = async () => ({ data: null, error: null })
  chain.single = async () => ({
    data: {
      id: 'session-1',
      session_type: 'work',
      planned_duration: 25,
      task_id: null,
      goal_id: null,
      started_at: new Date().toISOString(),
    },
    error: null,
  })
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve)
  return { from: () => chain }
}

const supabase = fakeSupabase()
vi.mock('@/lib/supabase/client', () => ({ createClient: () => supabase }))
const user = { id: 'user-1' }
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }))

import { FocusTimerProvider, useFocusTimer } from '../useFocusTimer'

const wrapper = ({ children }: { children: ReactNode }) => (
  <FocusTimerProvider>{children}</FocusTimerProvider>
)

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('focus timer', () => {
  it('counts down by the clock', async () => {
    const { result } = renderHook(() => useFocusTimer(), { wrapper })
    await flush()
    expect(result.current.timeRemaining).toBe(25 * 60)

    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(result.current.isRunning).toBe(true)
    expect(result.current.timeRemaining).toBe(25 * 60 - 10)
  })

  it('catches up after the tab was throttled or asleep', async () => {
    const { result } = renderHook(() => useFocusTimer(), { wrapper })
    await flush()
    await act(async () => {
      await result.current.start()
    })

    // Five minutes pass on the clock while no timer callbacks run at all.
    vi.setSystemTime(new Date('2026-11-15T12:05:00Z'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    expect(result.current.timeRemaining).toBeLessThanOrEqual(20 * 60)
    expect(result.current.timeRemaining).toBeGreaterThanOrEqual(20 * 60 - 1)
  })

  it('does not lose time while paused', async () => {
    const { result } = renderHook(() => useFocusTimer(), { wrapper })
    await flush()
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    act(() => result.current.pause())
    const frozen = result.current.timeRemaining
    expect(frozen).toBe(24 * 60)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000)
    })
    expect(result.current.timeRemaining).toBe(frozen)

    act(() => result.current.resume())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(result.current.timeRemaining).toBe(frozen - 30)
  })

  it('moves to a short break when the work session runs out', async () => {
    const { result } = renderHook(() => useFocusTimer(), { wrapper })
    await flush()
    await act(async () => {
      await result.current.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25 * 60_000 + 1000)
    })
    expect(result.current.currentSessionType).toBe('short_break')
    expect(result.current.sessionsCompleted).toBe(1)
    expect(result.current.isRunning).toBe(false)
    expect(result.current.timeRemaining).toBe(5 * 60)
  })

  it('picks a running timer back up after a reload', async () => {
    const first = renderHook(() => useFocusTimer(), { wrapper })
    await flush()
    await act(async () => {
      await first.result.current.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    first.unmount()

    // Two more minutes pass with the page closed.
    vi.setSystemTime(new Date('2026-11-15T12:03:00Z'))
    const second = renderHook(() => useFocusTimer(), { wrapper })
    await flush()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    expect(second.result.current.isRunning).toBe(true)
    expect(second.result.current.timeRemaining).toBeLessThanOrEqual(22 * 60)
    expect(second.result.current.timeRemaining).toBeGreaterThanOrEqual(22 * 60 - 2)
  })

  it('shares one timer between every consumer', async () => {
    const { result } = renderHook(() => ({ page: useFocusTimer(), sidebar: useFocusTimer() }), { wrapper })
    await flush()
    await act(async () => {
      await result.current.sidebar.start()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(result.current.page.isRunning).toBe(true)
    expect(result.current.page.timeRemaining).toBe(result.current.sidebar.timeRemaining)
  })
})
