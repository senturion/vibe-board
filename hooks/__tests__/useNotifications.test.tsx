import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
  }),
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

import { useNotifications } from '../useNotifications'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useNotifications', () => {
  it('does not crash where the browser has no Notification object (Safari on iPhone outside the Home Screen)', async () => {
    vi.stubGlobal('Notification', undefined)
    // jsdom has no Notification either; make sure the property is truly absent.
    delete (window as unknown as Record<string, unknown>).Notification
    const { result } = renderHook(() => useNotifications())
    await waitFor(() => expect(result.current.pushSupported).toBe(false))
    expect(await result.current.requestPermission()).toBe('default')
  })
})
