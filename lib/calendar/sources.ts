import { createHash } from 'node:crypto'
import { DAVClient } from 'tsdav'
import { CalendarEvent, eventsOnDay, sortEvents } from './expand'
import { addDaysToKey, zonedDayRange } from './zoned'

/**
 * Server-only. Reads the owner's calendars from two kinds of source, both set
 * in the server environment and never sent to the browser:
 * - CALENDAR_ICS_URLS: private iCal links (Google's "secret address in iCal
 *   format"), separated by spaces, commas or new lines.
 * - ICLOUD_USERNAME + ICLOUD_APP_PASSWORD: an Apple ID and an app-specific
 *   password, used over CalDAV.
 */

export interface CalendarInfo {
  id: string
  name: string
  color: string
  source: 'google' | 'icloud' | 'ics'
}

export interface DayCalendar {
  configured: boolean
  calendars: CalendarInfo[]
  events: CalendarEvent[]
  /** Plain messages safe to show; never contain a URL or credential. */
  errors: string[]
}

const PALETTE = ['#60a5fa', '#c084fc', '#4ade80', '#f59e0b', '#f472b6', '#2dd4bf']
const FEED_TTL_MS = 5 * 60 * 1000
const ICLOUD_CALENDARS_TTL_MS = 30 * 60 * 1000
const FETCH_TIMEOUT_MS = 10_000
const ICLOUD_SERVER = 'https://caldav.icloud.com'

const shortHash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16)

export function feedUrls(raw = process.env.CALENDAR_ICS_URLS): string[] {
  if (!raw) return []
  return raw
    .split(/[\s,]+/)
    .map(u => u.trim().replace(/^webcals?:\/\//i, 'https://'))
    .filter(u => {
      try {
        return new URL(u).protocol === 'https:'
      } catch {
        return false
      }
    })
}

function icloudCredentials() {
  const username = process.env.ICLOUD_USERNAME?.trim()
  const password = process.env.ICLOUD_APP_PASSWORD?.trim()
  return username && password ? { username, password } : null
}

export function calendarsConfigured() {
  return feedUrls().length > 0 || icloudCredentials() !== null
}

/** Reads a calendar-level property such as X-WR-CALNAME from feed text (handles folded lines). */
function feedProperty(ics: string, name: string): string | null {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '')
  const match = unfolded.match(new RegExp(`^${name}(?:;[^:]*)?:(.+)$`, 'im'))
  return match ? match[1].trim().replace(/\\,/g, ',').replace(/\\;/g, ';') : null
}

/** iCloud colours come as #RRGGBBAA; keep #RRGGBB. */
function cleanColor(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const match = value.trim().match(/^#[0-9a-f]{6}/i)
  return match ? match[0] : fallback
}

const feedCache = new Map<string, { at: number; text: string }>()

async function fetchFeed(url: string): Promise<string> {
  const cached = feedCache.get(url)
  if (cached && Date.now() - cached.at < FEED_TTL_MS) return cached.text
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  feedCache.set(url, { at: Date.now(), text })
  return text
}

async function feedDay(urls: string[], dateKey: string, tz: string): Promise<DayCalendar> {
  const result: DayCalendar = { configured: true, calendars: [], events: [], errors: [] }
  const settled = await Promise.allSettled(urls.map(fetchFeed))
  settled.forEach((outcome, i) => {
    const url = urls[i]
    const host = new URL(url).hostname
    const isGoogle = host.endsWith('google.com')
    if (outcome.status === 'rejected') {
      const reason = outcome.reason instanceof Error ? outcome.reason.message : 'unknown error'
      result.errors.push(`${isGoogle ? 'Google calendar' : 'Calendar link'} ${i + 1} could not be read (${reason}).`)
      return
    }
    const info: CalendarInfo = {
      id: `ics-${shortHash(url)}`,
      name: feedProperty(outcome.value, 'X-WR-CALNAME') ?? `Calendar ${i + 1}`,
      color: cleanColor(feedProperty(outcome.value, 'X-APPLE-CALENDAR-COLOR'), PALETTE[i % PALETTE.length]),
      source: isGoogle ? 'google' : 'ics',
    }
    result.calendars.push(info)
    result.events.push(...eventsOnDay(outcome.value, info.id, dateKey, tz))
  })
  return result
}

type DavCalendar = Awaited<ReturnType<DAVClient['fetchCalendars']>>[number]
let icloudCache: { at: number; key: string; client: DAVClient; calendars: DavCalendar[] } | null = null

async function icloudClient(creds: { username: string; password: string }) {
  const key = shortHash(`${creds.username}:${creds.password}`)
  if (icloudCache && icloudCache.key === key && Date.now() - icloudCache.at < ICLOUD_CALENDARS_TTL_MS) {
    return icloudCache
  }
  const client = new DAVClient({
    serverUrl: ICLOUD_SERVER,
    credentials: creds,
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })
  await client.login()
  const calendars = (await client.fetchCalendars()).filter(c => !c.components || c.components.includes('VEVENT'))
  icloudCache = { at: Date.now(), key, client, calendars }
  return icloudCache
}

function displayName(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && '_cdata' in value && typeof (value as { _cdata: unknown })._cdata === 'string') {
    return (value as { _cdata: string })._cdata
  }
  return fallback
}

async function icloudDay(creds: { username: string; password: string }, dateKey: string, tz: string): Promise<DayCalendar> {
  const result: DayCalendar = { configured: true, calendars: [], events: [], errors: [] }
  let session: Awaited<ReturnType<typeof icloudClient>>
  try {
    session = await icloudClient(creds)
  } catch (error) {
    console.error('iCloud calendar sign-in failed:', error instanceof Error ? error.message : error)
    result.errors.push('iCloud sign-in failed. Check ICLOUD_USERNAME and ICLOUD_APP_PASSWORD in Vercel.')
    return result
  }

  // Ask for a day either side so the server's idea of the range never cuts an event off;
  // eventsOnDay then keeps only what falls on the owner's day.
  const start = zonedDayRange(addDaysToKey(dateKey, -1), tz).start.toISOString()
  const end = zonedDayRange(addDaysToKey(dateKey, 1), tz).end.toISOString()

  const settled = await Promise.allSettled(
    session.calendars.map(calendar => session.client.fetchCalendarObjects({ calendar, timeRange: { start, end } })),
  )
  settled.forEach((outcome, i) => {
    const calendar = session.calendars[i]
    const info: CalendarInfo = {
      id: `icloud-${shortHash(calendar.url)}`,
      name: displayName(calendar.displayName, `iCloud ${i + 1}`),
      color: cleanColor(calendar.calendarColor, PALETTE[i % PALETTE.length]),
      source: 'icloud',
    }
    result.calendars.push(info)
    if (outcome.status === 'rejected') {
      result.errors.push(`iCloud calendar "${info.name}" could not be read.`)
      return
    }
    for (const object of outcome.value) {
      if (typeof object.data === 'string') {
        result.events.push(...eventsOnDay(object.data, info.id, dateKey, tz))
      }
    }
  })
  return result
}

/** Every configured calendar and its events on one day in the owner's zone. */
export async function loadDay(dateKey: string, tz: string): Promise<DayCalendar> {
  const urls = feedUrls()
  const creds = icloudCredentials()
  if (urls.length === 0 && !creds) {
    return { configured: false, calendars: [], events: [], errors: [] }
  }
  const parts = await Promise.all([
    urls.length > 0 ? feedDay(urls, dateKey, tz) : null,
    creds ? icloudDay(creds, dateKey, tz) : null,
  ])
  const merged: DayCalendar = { configured: true, calendars: [], events: [], errors: [] }
  for (const part of parts) {
    if (!part) continue
    merged.calendars.push(...part.calendars)
    merged.events.push(...part.events)
    merged.errors.push(...part.errors)
  }
  merged.events = sortEvents(merged.events)
  return merged
}
