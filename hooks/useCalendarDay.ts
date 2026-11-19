'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import type { DayCalendar } from '@/lib/calendar/sources'

const REFRESH_MS = 15 * 60 * 1000

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** The owner's connected calendars and their events on one day, refreshed every 15 minutes. */
export function useCalendarDay(dateKey: string) {
  const { user } = useAuth()
  const tz = browserTimeZone()
  return useQuery<DayCalendar>({
    queryKey: ['calendar-day', user?.id ?? 'signed-out', dateKey, tz],
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    refetchInterval: REFRESH_MS,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(`/api/calendar?date=${encodeURIComponent(dateKey)}&tz=${encodeURIComponent(tz)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Calendar request failed (${res.status})`)
      return res.json() as Promise<DayCalendar>
    },
  })
}
