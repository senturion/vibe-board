import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

type PushSubscriptionRow = Database['public']['Tables']['push_subscriptions']['Row']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ error: 'No subscriptions found' }, { status: 404 })
  }

  const { title, body, url } = await request.json().catch(() => ({}))

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

  const payload = JSON.stringify({
    title: title || 'VibeBoard',
    body: body || 'Test notification delivered.',
    url: url || '/',
  })

  const results = await Promise.allSettled(
    (subscriptions as PushSubscriptionRow[]).map(sub =>
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

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.length - sent

  return NextResponse.json({ sent, failed })
}
