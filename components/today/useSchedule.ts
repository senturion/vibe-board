'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCalendarDay } from '@/hooks/useCalendarDay'
import { useSettings } from '@/hooks/useSettings'
import { freeUntil, remainingCount, visibleEvents } from '@/lib/calendar/schedule'
import { formatDateKey } from '@/lib/types'

/** A clock that ticks once a minute, on the minute. */
function useMinuteClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60_000)
    }, 60_000 - (Date.now() % 60_000))
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])
  return now
}

/** Today's events from the calendars the owner chose to show. */
export function useSchedule() {
  const now = useMinuteClock()
  const dateKey = formatDateKey(now)
  const { settings } = useSettings()
  const query = useCalendarDay(dateKey)
  const hidden = settings.hiddenCalendarIds

  return useMemo(() => {
    const data = query.data
    const events = data ? visibleEvents(data.events, hidden) : []
    const calendars = new Map((data?.calendars ?? []).map(c => [c.id, c]))
    return {
      now,
      loading: query.isLoading,
      failed: query.isError,
      configured: data?.configured ?? false,
      errors: data?.errors ?? [],
      events,
      calendars,
      remaining: remainingCount(events, now),
      freeUntil: freeUntil(events, now),
    }
  }, [query.data, query.isLoading, query.isError, hidden, now])
}

export type Schedule = ReturnType<typeof useSchedule>
