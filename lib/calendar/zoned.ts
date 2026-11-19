/** Time-zone arithmetic with Intl only, so the server (which runs in UTC) can work in the owner's zone. */

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** How far ahead of UTC the zone's wall clock is at this instant, in ms. */
function zoneOffsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return wall - Math.floor(instant / 1000) * 1000
}

/** The instant at which the zone's wall clock reads the given local time. */
export function zonedTimeToUtc(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  tz: string,
): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  const first = asUtc - zoneOffsetMs(asUtc, tz)
  const second_ = asUtc - zoneOffsetMs(first, tz)
  return new Date(second_)
}

/** [start, end) of a calendar day (YYYY-MM-DD) in a zone. */
export function zonedDayRange(dateKey: string, tz: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  return {
    start: zonedTimeToUtc(y, m, d, 0, 0, 0, tz),
    end: zonedTimeToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0, tz),
  }
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
