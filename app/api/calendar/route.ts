import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadDay } from '@/lib/calendar/sources'
import { isValidTimeZone } from '@/lib/calendar/zoned'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store' }

/** GET /api/calendar?date=YYYY-MM-DD&tz=America/Toronto — the owner's events on that day. */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
  }
  // The calendars belong to the owner; when one is configured, nobody else may read them.
  const owner = process.env.MCP_OWNER_USER_ID?.trim()
  if (owner && owner !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: noStore })
  }

  const params = request.nextUrl.searchParams
  const date = params.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400, headers: noStore })
  }
  const requestedTz = params.get('tz')
  const tz = isValidTimeZone(requestedTz) ? requestedTz : (process.env.MCP_OWNER_TIMEZONE || 'UTC')

  const day = await loadDay(date, tz)
  return NextResponse.json(day, { headers: noStore })
}
