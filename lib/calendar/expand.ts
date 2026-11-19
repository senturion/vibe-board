import ICAL from 'ical.js'
import { addDaysToKey, isValidTimeZone, zonedDayRange, zonedTimeToUtc } from './zoned'

export interface CalendarEvent {
  /** Stable per occurrence, for React keys. */
  id: string
  calendarId: string
  title: string
  location: string | null
  allDay: boolean
  /** ISO instants for timed events; YYYY-MM-DD (end exclusive) for all-day ones. */
  start: string
  end: string
}

const MAX_ITERATIONS = 20000

function dateKeyOf(t: ICAL.Time): string {
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
}

/**
 * The instant an ICAL.Time stands for. Times in a zone the file defines (or
 * UTC) convert directly; floating times, and times naming a zone the file
 * does not define, are read in that IANA zone if it is one, else the owner's.
 */
function toInstant(t: ICAL.Time, ownerTz: string): Date {
  const zone = t.zone
  const known = zone && (zone === ICAL.Timezone.utcTimezone ||
    (zone.tzid !== 'floating' && zone !== ICAL.Timezone.localTimezone && zone.component))
  if (known) return t.toJSDate()
  const named = (t as unknown as { timezone?: string }).timezone
  const tz = isValidTimeZone(named) ? named : ownerTz
  return zonedTimeToUtc(t.year, t.month, t.day, t.hour, t.minute, t.second, tz)
}

function text(component: ICAL.Component, name: string): string | null {
  const value = component.getFirstPropertyValue(name)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function isCancelled(component: ICAL.Component) {
  return String(component.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED'
}

/** Registers the file's own VTIMEZONE definitions so its times convert correctly. */
function registerZones(root: ICAL.Component) {
  for (const vtz of root.getAllSubcomponents('vtimezone')) {
    const tzid = vtz.getFirstPropertyValue('tzid')
    if (typeof tzid === 'string' && !ICAL.TimezoneService.has(tzid)) {
      ICAL.TimezoneService.register(vtz)
    }
  }
}

/**
 * Every occurrence of the events in one iCalendar text that falls on the given
 * day in the owner's zone: recurring events expanded, moved and cancelled
 * occurrences applied.
 */
export function eventsOnDay(icsText: string, calendarId: string, dateKey: string, ownerTz: string): CalendarEvent[] {
  let root: ICAL.Component
  try {
    root = new ICAL.Component(ICAL.parse(icsText))
  } catch {
    return []
  }
  // A CalDAV object is a VCALENDAR; a feed is too. Anything else has no events.
  if (root.name !== 'vcalendar') return []
  registerZones(root)

  const { start: dayStart, end: dayEnd } = zonedDayRange(dateKey, ownerTz)
  const nextDayKey = addDaysToKey(dateKey, 1)

  const masters: ICAL.Component[] = []
  const exceptions = new Map<string, ICAL.Component[]>()
  for (const vevent of root.getAllSubcomponents('vevent')) {
    const uid = String(vevent.getFirstPropertyValue('uid') || '')
    if (vevent.hasProperty('recurrence-id')) {
      const list = exceptions.get(uid) ?? []
      list.push(vevent)
      exceptions.set(uid, list)
    } else {
      masters.push(vevent)
    }
  }

  const out: CalendarEvent[] = []

  const consider = (component: ICAL.Component, start: ICAL.Time, end: ICAL.Time | null, key: string) => {
    if (isCancelled(component)) return
    const title = text(component, 'summary') ?? '(No title)'
    const location = text(component, 'location')
    if (start.isDate) {
      const startKey = dateKeyOf(start)
      const endKey = end ? dateKeyOf(end) : addDaysToKey(startKey, 1)
      const lastExclusive = endKey > startKey ? endKey : addDaysToKey(startKey, 1)
      if (startKey <= dateKey && dateKey < lastExclusive) {
        out.push({ id: `${calendarId}:${key}`, calendarId, title, location, allDay: true, start: startKey, end: lastExclusive })
      }
      return
    }
    const s = toInstant(start, ownerTz)
    const e = end ? toInstant(end, ownerTz) : s
    // Overlaps the day; a zero-length event counts if it starts within it.
    const overlaps = e > s ? s < dayEnd && e > dayStart : s >= dayStart && s < dayEnd
    if (overlaps) {
      out.push({ id: `${calendarId}:${key}`, calendarId, title, location, allDay: false, start: s.toISOString(), end: e.toISOString() })
    }
  }

  for (const master of masters) {
    let event: ICAL.Event
    try {
      event = new ICAL.Event(master)
    } catch {
      continue
    }
    if (!event.startDate) continue
    const uid = event.uid || String(out.length)
    for (const ex of exceptions.get(event.uid) ?? []) event.relateException(ex)
    exceptions.delete(event.uid)

    if (!event.isRecurring()) {
      consider(master, event.startDate, event.endDate, uid)
      continue
    }

    const iterator = event.iterator()
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const next = iterator.next()
      if (!next) break
      const details = event.getOccurrenceDetails(next)
      const start = details.startDate
      if (start.isDate ? dateKeyOf(start) >= nextDayKey : toInstant(start, ownerTz) >= dayEnd) break
      consider(details.item.component, start, details.endDate, `${uid}:${next.toString()}`)
    }
  }

  // Moved occurrences whose series was not in this file (CalDAV can return these alone).
  for (const [uid, list] of exceptions) {
    for (const ex of list) {
      try {
        const event = new ICAL.Event(ex)
        if (event.startDate) consider(ex, event.startDate, event.endDate, `${uid}:${event.recurrenceId?.toString()}`)
      } catch {
        // skip unreadable components
      }
    }
  }

  return out
}

/** All-day events first, then by start time, then by title. */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    if (a.start !== b.start) return a.start < b.start ? -1 : 1
    return a.title.localeCompare(b.title)
  })
}
