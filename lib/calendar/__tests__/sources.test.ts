import { afterEach, describe, expect, it, vi } from 'vitest'
import { feedUrls, loadDay } from '../sources'

const FEED = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'X-WR-CALNAME:Work',
  'BEGIN:VEVENT', 'UID:1', 'SUMMARY:Design review', 'DTSTART:20261119T150000Z', 'DTEND:20261119T160000Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:2', 'SUMMARY:Tomorrow', 'DTSTART:20261120T150000Z', 'DTEND:20261120T160000Z', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

const SECRET = 'https://calendar.google.com/calendar/ical/me%40example.com/private-abc123/basic.ics'
const BROKEN = 'https://calendar.google.com/calendar/ical/other/private-zzz/basic.ics'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('feedUrls', () => {
  it('splits, upgrades webcal and drops anything not https', () => {
    expect(feedUrls('webcal://a.example/x.ics, https://b.example/y.ics\nhttp://c.example/z.ics nonsense')).toEqual([
      'https://a.example/x.ics', 'https://b.example/y.ics',
    ])
    expect(feedUrls(undefined)).toEqual([])
  })
})

describe('loadDay', () => {
  it('reports not configured when nothing is set', async () => {
    vi.stubEnv('CALENDAR_ICS_URLS', '')
    vi.stubEnv('ICLOUD_USERNAME', '')
    vi.stubEnv('ICLOUD_APP_PASSWORD', '')
    expect(await loadDay('2026-11-19', 'America/Toronto')).toEqual({ configured: false, calendars: [], events: [], errors: [] })
  })

  it('reads feeds, names them, and never echoes a feed URL in errors', async () => {
    vi.stubEnv('CALENDAR_ICS_URLS', `${SECRET} ${BROKEN}`)
    vi.stubEnv('ICLOUD_USERNAME', '')
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url === SECRET ? new Response(FEED, { status: 200 }) : new Response('nope', { status: 404 })))

    const day = await loadDay('2026-11-19', 'America/Toronto')
    expect(day.configured).toBe(true)
    expect(day.calendars).toHaveLength(1)
    expect(day.calendars[0]).toMatchObject({ name: 'Work', source: 'google' })
    expect(day.calendars[0].id).not.toContain('private')
    expect(day.events.map(e => e.title)).toEqual(['Design review'])
    expect(day.errors).toEqual(['Google calendar 2 could not be read (HTTP 404).'])
    expect(JSON.stringify(day)).not.toContain('private-')
  })
})
