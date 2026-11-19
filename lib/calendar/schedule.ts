import type { CalendarEvent } from './expand'

export type EventTiming = 'all-day' | 'past' | 'now' | 'upcoming'

export function eventTiming(event: CalendarEvent, now: Date): EventTiming {
  if (event.allDay) return 'all-day'
  const start = new Date(event.start).getTime()
  const end = Math.max(new Date(event.end).getTime(), start)
  const t = now.getTime()
  if (end <= t && !(end === start && start === t)) return 'past'
  if (start <= t) return 'now'
  return 'upcoming'
}

export function visibleEvents(events: CalendarEvent[], hiddenCalendarIds: string[]) {
  if (hiddenCalendarIds.length === 0) return events
  const hidden = new Set(hiddenCalendarIds)
  return events.filter(e => !hidden.has(e.calendarId))
}

/** Timed events that have not finished yet. */
export function remainingCount(events: CalendarEvent[], now: Date) {
  return events.filter(e => {
    const timing = eventTiming(e, now)
    return timing === 'now' || timing === 'upcoming'
  }).length
}

/**
 * When the next timed event starts, if nothing is on right now. Null while an
 * event is in progress or when nothing else is scheduled today.
 */
export function freeUntil(events: CalendarEvent[], now: Date): Date | null {
  let next: number | null = null
  for (const e of events) {
    const timing = eventTiming(e, now)
    if (timing === 'now') return null
    if (timing === 'upcoming') {
      const start = new Date(e.start).getTime()
      if (next === null || start < next) next = start
    }
  }
  return next === null ? null : new Date(next)
}

export function formatClock(iso: string | Date) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDuration(event: CalendarEvent) {
  const minutes = Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000)
  if (minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
