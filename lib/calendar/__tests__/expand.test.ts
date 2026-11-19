import { describe, expect, it } from 'vitest'
import { eventsOnDay, sortEvents } from '../expand'
import { zonedDayRange } from '../zoned'

const TZ = 'America/Toronto'

const VTZ = `BEGIN:VTIMEZONE
TZID:America/Toronto
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`

const cal = (body: string, withZone = true) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:test', withZone ? VTZ : '', body, 'END:VCALENDAR'].filter(Boolean).join('\r\n')

const ev = (lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n')

describe('zonedDayRange', () => {
  it('gives midnight to midnight in the zone, across a DST change', () => {
    expect(zonedDayRange('2026-11-19', TZ).start.toISOString()).toBe('2026-11-19T05:00:00.000Z')
    const dst = zonedDayRange('2026-11-01', TZ)
    expect(dst.start.toISOString()).toBe('2026-11-01T04:00:00.000Z')
    expect(dst.end.toISOString()).toBe('2026-11-02T05:00:00.000Z')
  })
})

describe('eventsOnDay', () => {
  it('finds a timed event in a named zone', () => {
    const ics = cal(ev(['UID:a', 'SUMMARY:Design review', 'LOCATION:Room 4', 'DTSTART;TZID=America/Toronto:20261119T100000', 'DTEND;TZID=America/Toronto:20261119T110000']))
    const [e] = eventsOnDay(ics, 'c1', '2026-11-19', TZ)
    expect(e).toMatchObject({ title: 'Design review', location: 'Room 4', allDay: false, start: '2026-11-19T15:00:00.000Z', end: '2026-11-19T16:00:00.000Z' })
  })

  it('ignores events on other days', () => {
    const ics = cal(ev(['UID:a', 'SUMMARY:x', 'DTSTART:20261120T150000Z', 'DTEND:20261120T160000Z']))
    expect(eventsOnDay(ics, 'c1', '2026-11-19', TZ)).toEqual([])
  })

  it('places a late-evening UTC event on the local day', () => {
    // 02:00 UTC on the 20th is 9 PM on the 19th in Toronto.
    const ics = cal(ev(['UID:a', 'SUMMARY:Late', 'DTSTART:20261120T020000Z', 'DTEND:20261120T030000Z']))
    expect(eventsOnDay(ics, 'c1', '2026-11-19', TZ)).toHaveLength(1)
    expect(eventsOnDay(ics, 'c1', '2026-11-20', TZ)).toHaveLength(0)
  })

  it('handles single and multi-day all-day events', () => {
    const ics = cal([
      ev(['UID:b', 'SUMMARY:Birthday', 'DTSTART;VALUE=DATE:20261119', 'DTEND;VALUE=DATE:20261120']),
      ev(['UID:c', 'SUMMARY:Trip', 'DTSTART;VALUE=DATE:20261118', 'DTEND;VALUE=DATE:20261121']),
      ev(['UID:d', 'SUMMARY:Yesterday', 'DTSTART;VALUE=DATE:20261118', 'DTEND;VALUE=DATE:20261119']),
    ].join('\r\n'))
    const titles = eventsOnDay(ics, 'c1', '2026-11-19', TZ).map(e => e.title).sort()
    expect(titles).toEqual(['Birthday', 'Trip'])
  })

  it('expands a weekly series, skipping excluded and cancelled dates and moving exceptions', () => {
    const series = ev(['UID:s', 'SUMMARY:Standup', 'DTSTART;TZID=America/Toronto:20260105T083000', 'DTEND;TZID=America/Toronto:20260105T090000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,TH', 'EXDATE;TZID=America/Toronto:20261126T083000'])
    const moved = ev(['UID:s', 'SUMMARY:Standup (moved)', 'RECURRENCE-ID;TZID=America/Toronto:20261203T083000', 'DTSTART;TZID=America/Toronto:20261203T130000', 'DTEND;TZID=America/Toronto:20261203T133000'])
    const ics = cal([series, moved].join('\r\n'))
    const today = eventsOnDay(ics, 'c1', '2026-11-19', TZ)
    expect(today).toHaveLength(1)
    // 8:30 EST after the DST change
    expect(today[0].start).toBe('2026-11-19T13:30:00.000Z')
    expect(eventsOnDay(ics, 'c1', '2026-11-26', TZ)).toEqual([])
    const movedDay = eventsOnDay(ics, 'c1', '2026-12-03', TZ)
    expect(movedDay.map(e => e.title)).toEqual(['Standup (moved)'])
    expect(movedDay[0].start).toBe('2026-12-03T18:00:00.000Z')
  })

  it('keeps the wall-clock time of a series across DST', () => {
    const ics = cal(ev(['UID:s', 'SUMMARY:Gym', 'DTSTART;TZID=America/Toronto:20260601T070000', 'DTEND;TZID=America/Toronto:20260601T080000', 'RRULE:FREQ=DAILY']))
    expect(eventsOnDay(ics, 'c1', '2026-07-01', TZ)[0].start).toBe('2026-07-01T11:00:00.000Z')
    expect(eventsOnDay(ics, 'c1', '2026-12-01', TZ)[0].start).toBe('2026-12-01T12:00:00.000Z')
  })

  it('skips cancelled events', () => {
    const ics = cal(ev(['UID:a', 'SUMMARY:Off', 'STATUS:CANCELLED', 'DTSTART:20261119T150000Z', 'DTEND:20261119T160000Z']))
    expect(eventsOnDay(ics, 'c1', '2026-11-19', TZ)).toEqual([])
  })

  it('reads floating times and undefined zones in the owner zone', () => {
    const ics = cal([
      ev(['UID:f', 'SUMMARY:Floating', 'DTSTART:20261119T120000', 'DTEND:20261119T130000']),
      ev(['UID:g', 'SUMMARY:Named', 'DTSTART;TZID=America/Chicago:20261119T090000', 'DTEND;TZID=America/Chicago:20261119T100000']),
    ].join('\r\n'), false)
    const byTitle = Object.fromEntries(eventsOnDay(ics, 'c1', '2026-11-19', TZ).map(e => [e.title, e.start]))
    expect(byTitle.Floating).toBe('2026-11-19T17:00:00.000Z')
    expect(byTitle.Named).toBe('2026-11-19T15:00:00.000Z')
  })

  it('returns nothing for text that is not a calendar', () => {
    expect(eventsOnDay('not ics', 'c1', '2026-11-19', TZ)).toEqual([])
  })

  it('sorts all-day first, then by time', () => {
    const base = { calendarId: 'c', location: null }
    const sorted = sortEvents([
      { ...base, id: '1', title: 'B', allDay: false, start: '2026-11-19T16:00:00.000Z', end: '' },
      { ...base, id: '2', title: 'A', allDay: false, start: '2026-11-19T15:00:00.000Z', end: '' },
      { ...base, id: '3', title: 'Z', allDay: true, start: '2026-11-19', end: '2026-11-20' },
    ])
    expect(sorted.map(e => e.id)).toEqual(['3', '2', '1'])
  })
})
