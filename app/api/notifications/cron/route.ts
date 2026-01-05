import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/lib/supabase/types'

type NotificationSettingsRow = Database['public']['Tables']['notification_settings']['Row']
type PushSubscriptionRow = Database['public']['Tables']['push_subscriptions']['Row']

const WINDOW_MINUTES = 15

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'Missing VAPID keys' }, { status: 500 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@vibeboard.app',
    publicKey,
    privateKey
  )

  const supabase = createAdminClient()
  const { data: settings, error: settingsError } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('enabled', true)

  if (settingsError) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }

  const { data: subscriptions, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (subsError) {
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 })
  }

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const sub of (subscriptions || []) as PushSubscriptionRow[]) {
    if (!subscriptionsByUser.has(sub.user_id)) {
      subscriptionsByUser.set(sub.user_id, [])
    }
    subscriptionsByUser.get(sub.user_id)!.push(sub)
  }

  const now = new Date()
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const setting of (settings || []) as NotificationSettingsRow[]) {
    const userSubs = subscriptionsByUser.get(setting.user_id) || []
    if (userSubs.length === 0) {
      skipped++
      continue
    }

    const isDue = isReminderDue(setting, now)
    if (!isDue) {
      skipped++
      continue
    }

    if (!hasAnyChannelEnabled(setting)) {
      skipped++
      continue
    }

    const body = buildReminderMessage(setting)
    const payload = JSON.stringify({
      title: 'VibeBoard',
      body,
      url: '/?from=notification',
    })

    const results = await Promise.allSettled(
      userSubs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      )
    )

    const hadSuccess = results.some(r => r.status === 'fulfilled')
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        sent++
        continue
      }

      failed++
      const statusCode = (result.reason as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        const stale = userSubs[index]
        if (stale) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('push_subscriptions') as any)
            .delete()
            .eq('user_id', stale.user_id)
            .eq('endpoint', stale.endpoint)
        }
      }
    }

    if (hadSuccess) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notification_settings') as any)
        .update({ last_sent_at: now.toISOString(), updated_at: now.toISOString() })
        .eq('user_id', setting.user_id)
    }
  }

  return NextResponse.json({ sent, failed, skipped })
}

function isReminderDue(setting: NotificationSettingsRow, now: Date) {
  const timezone = setting.timezone || 'UTC'
  const nowParts = getZonedParts(now, timezone)
  const [targetHour, targetMinute] = (setting.daily_time || '20:00')
    .split(':')
    .map(part => parseInt(part, 10))

  const targetMinutes = (targetHour || 0) * 60 + (targetMinute || 0)
  const currentMinutes = nowParts.hour * 60 + nowParts.minute
  const withinWindow = isWithinWindow(currentMinutes, targetMinutes, WINDOW_MINUTES)

  if (!withinWindow) return false
  if (isWithinQuietHours(setting, nowParts)) return false

  if (!setting.last_sent_at) return true
  const lastSent = getZonedParts(new Date(setting.last_sent_at), timezone)
  return !(lastSent.year === nowParts.year && lastSent.month === nowParts.month && lastSent.day === nowParts.day)
}

function isWithinWindow(current: number, target: number, windowMinutes: number) {
  if (windowMinutes <= 0) return false
  if (target + windowMinutes < 1440) {
    return current >= target && current < target + windowMinutes
  }
  const overflow = (target + windowMinutes) % 1440
  return current >= target || current < overflow
}

function isWithinQuietHours(setting: NotificationSettingsRow, nowParts: { hour: number; minute: number }) {
  const [quietStartHour, quietStartMinute] = (setting.quiet_start || '22:00')
    .split(':')
    .map(part => parseInt(part, 10))
  const [quietEndHour, quietEndMinute] = (setting.quiet_end || '07:00')
    .split(':')
    .map(part => parseInt(part, 10))

  const quietStart = (quietStartHour || 0) * 60 + (quietStartMinute || 0)
  const quietEnd = (quietEndHour || 0) * 60 + (quietEndMinute || 0)
  const current = nowParts.hour * 60 + nowParts.minute

  if (quietStart === quietEnd) return false
  if (quietStart < quietEnd) {
    return current >= quietStart && current < quietEnd
  }
  return current >= quietStart || current < quietEnd
}

function hasAnyChannelEnabled(setting: NotificationSettingsRow) {
  return Boolean(setting.channel_journal || setting.channel_habits || setting.channel_routines)
}

function buildReminderMessage(setting: NotificationSettingsRow) {
  if (setting.reminder_message) return setting.reminder_message

  const parts: string[] = []
  if (setting.channel_journal) parts.push('journal')
  if (setting.channel_habits) parts.push('habits')
  if (setting.channel_routines) parts.push('routines')

  if (parts.length === 0) return 'Time for your daily check-in.'
  if (parts.length === 1) return `Time to ${parts[0]}?`
  if (parts.length === 2) return `Time for your ${parts[0]} and ${parts[1]}?`
  return `Time for your ${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}?`
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const lookup = (type: string) => parts.find(part => part.type === type)?.value || '00'
  return {
    year: Number(lookup('year')),
    month: Number(lookup('month')),
    day: Number(lookup('day')),
    hour: Number(lookup('hour')),
    minute: Number(lookup('minute')),
  }
}
