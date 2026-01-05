'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@/lib/supabase/types'

type NotificationSettingsRow = Database['public']['Tables']['notification_settings']['Row']

const DEFAULT_TIME = '20:00'
const DEFAULT_QUIET_START = '22:00'
const DEFAULT_QUIET_END = '07:00'
const DEFAULT_MESSAGE = 'Time to journal?'

export function useNotifications() {
  const { user } = useAuth()
  const supabase = createClient()

  const [settings, setSettings] = useState<NotificationSettingsRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushSupported, setPushSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [pushEnabled, setPushEnabled] = useState(false)

  const timezone = useMemo(() => {
    if (typeof Intl !== 'undefined') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
    return 'UTC'
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window)
    setPermission(Notification.permission || 'default')
  }, [])

  useEffect(() => {
    let isActive = true
    const fetchSettings = async () => {
      if (!user) {
        if (isActive) {
          setSettings(null)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error)
      }

      if (isActive) {
        if (data) {
          setSettings(data)
        } else {
          setSettings({
            user_id: user.id,
            enabled: false,
            daily_time: DEFAULT_TIME,
            timezone,
            last_sent_at: null,
            reminder_message: DEFAULT_MESSAGE,
            quiet_start: DEFAULT_QUIET_START,
            quiet_end: DEFAULT_QUIET_END,
            channel_journal: true,
            channel_habits: false,
            channel_routines: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
        setLoading(false)
      }
    }

    fetchSettings()
    return () => {
      isActive = false
    }
  }, [user, supabase, timezone])

  useEffect(() => {
    const syncPushStatus = async () => {
      if (!pushSupported) return
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setPushEnabled(false)
        return
      }
      const subscription = await registration.pushManager.getSubscription()
      setPushEnabled(!!subscription)
    }

    if (typeof window !== 'undefined') {
      syncPushStatus()
    }
  }, [pushSupported])

  const saveSettings = useCallback(async (updates: Partial<NotificationSettingsRow>) => {
    if (!user) return
    const next = {
      ...(settings || {
        user_id: user.id,
        enabled: false,
        daily_time: DEFAULT_TIME,
        timezone,
        last_sent_at: null,
        reminder_message: DEFAULT_MESSAGE,
        quiet_start: DEFAULT_QUIET_START,
        quiet_end: DEFAULT_QUIET_END,
        channel_journal: true,
        channel_habits: false,
        channel_routines: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      ...updates,
      updated_at: new Date().toISOString(),
    }

    setSettings(next)

    const { error } = await supabase
      .from('notification_settings')
      .upsert(next, { onConflict: 'user_id' })

    if (error) {
      console.error('Error saving notification settings:', error)
    }
  }, [user, supabase, settings, timezone])

  const requestPermission = useCallback(async () => {
    if (!pushSupported) return 'default'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [pushSupported])

  const ensureServiceWorker = useCallback(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) return registration
    return navigator.serviceWorker.register('/sw.js')
  }, [])

  const subscribeToPush = useCallback(async () => {
    if (!pushSupported || !user) return false
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      return false
    }

    const reg = await ensureServiceWorker()
    const existing = await reg.pushManager.getSubscription()
    const subscription = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    const json = subscription.toJSON()
    if (!json.keys?.p256dh || !json.keys?.auth) {
      console.error('Invalid push subscription keys')
      return false
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' })

    if (error) {
      console.error('Error saving push subscription:', error)
      return false
    }

    setPushEnabled(true)
    return true
  }, [pushSupported, user, supabase, ensureServiceWorker])

  const unsubscribeFromPush = useCallback(async () => {
    if (!pushSupported || !user) return
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return

    await subscription.unsubscribe()

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)

    if (error) {
      console.error('Error removing push subscription:', error)
    }
    setPushEnabled(false)
  }, [pushSupported, user, supabase])

  return {
    settings,
    loading,
    pushSupported,
    pushEnabled,
    permission,
    timezone,
    saveSettings,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
