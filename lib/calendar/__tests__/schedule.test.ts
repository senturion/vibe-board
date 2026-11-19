import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../expand'
import { eventTiming, formatDuration, freeUntil, remainingCount, visibleEvents } from '../schedule'

const timed = (id: string, start: string, end: string, calendarId = 'a'): CalendarEvent =>
  ({ id, calendarId, title: id, location: null, allDay: false, start, end })
const allDay: CalendarEvent = { id: 'bday', calendarId: 'b', title: 'Birthday', location: null, allDay: true, start: '2026-11-19', end: '2026-11-20' }

const standup = timed('standup', '2026-11-19T13:30:00Z', '2026-11-19T14:00:00Z')
const review = timed('review', '2026-11-19T15:00:00Z', '2026-11-19T16:00:00Z')
const lunch = timed('lunch', '2026-11-19T17:30:00Z', '2026-11-19T18:30:00Z', 'b')
const events = [allDay, standup, review, lunch]

describe('schedule', () => {
  const at = (iso: string) => new Date(iso)

  it('labels each event against the current time', () => {
    const now = at('2026-11-19T15:25:00Z')
    expect(events.map(e => eventTiming(e, now))).toEqual(['all-day', 'past', 'now', 'upcoming'])
  })

  it('counts timed events not yet finished', () => {
    expect(remainingCount(events, at('2026-11-19T15:25:00Z'))).toBe(2)
    expect(remainingCount(events, at('2026-11-19T20:00:00Z'))).toBe(0)
  })

  it('says when the next event starts only while nothing is on', () => {
    expect(freeUntil(events, at('2026-11-19T15:25:00Z'))).toBeNull()
    expect(freeUntil(events, at('2026-11-19T16:10:00Z'))?.toISOString()).toBe('2026-11-19T17:30:00.000Z')
    expect(freeUntil(events, at('2026-11-19T19:00:00Z'))).toBeNull()
  })

  it('hides chosen calendars', () => {
    expect(visibleEvents(events, ['b']).map(e => e.id)).toEqual(['standup', 'review'])
    expect(visibleEvents(events, [])).toBe(events)
  })

  it('formats durations', () => {
    expect(formatDuration(standup)).toBe('30 min')
    expect(formatDuration(review)).toBe('1 h')
    expect(formatDuration(timed('x', '2026-11-19T15:00:00Z', '2026-11-19T16:45:00Z'))).toBe('1 h 45 min')
  })
})
