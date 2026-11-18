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
  // The last thing that went wrong, in words, shown in Settings. Failures used
  // to go only to the developer console, so the screen gave no reason.
  const [pushError, setPushError] = useState<string | null>(null)

  const ensureServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported in this browser.')
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error('Service workers require a secure context (HTTPS or localhost).')
    }

    const registrations = await navigator.serviceWorker.getRegistrations()
    const existing = registrations.find((reg) => reg.scope === `${location.origin}/`) ?? registrations[0]
    if (existing?.active) return existing

    const swPath = process.env.NODE_ENV === 'development' ? '/push-sw.js' : '/sw.js'
    const newRegistration = existing || await navigator.serviceWorker.register(swPath, {
      scope: '/',
      updateViaCache: 'none',
    })

    newRegistration.update().catch((err) => {
      console.warn('Service worker update check failed:', err)
    })

    const worker = newRegistration.installing || newRegistration.waiting
    if (worker) {
      await new Promise<void>((resolve) => {
        const handleState = () => {
          if (worker.state === 'activated') {
            worker.removeEventListener('statechange', handleState)
            resolve()
          }
        }
        worker.addEventListener('statechange', handleState)
        handleState()
      })
    }

    const readyRegistration = await navigator.serviceWorker.ready
    if (readyRegistration.active) return readyRegistration

    const refreshed = await navigator.serviceWorker.getRegistrations()
    const refreshedActive = refreshed.find((reg) => reg.active)
    if (refreshedActive) return refreshedActive

    throw new Error('Service worker did not activate. Reload and try again.')
  }, [])

  const timezone = useMemo(() => {
    if (typeof Intl !== 'undefined') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
    return 'UTC'
  }, [])

  // Safari on iPhone and iPad has no Notification object at all unless the
  // site is opened from the Home Screen, so every use must check for it.
  // Reading Notification.permission without the check threw and took the
  // whole app down on iOS.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setPushSupported(supported)
    if (!supported) return

    // Re-read on focus too: permission changed in the browser or system
    // settings while the page was open would otherwise not show until reload.
    const readPermission = () => setPermission(window.Notification.permission || 'default')
    readPermission()
    window.addEventListener('focus', readPermission)
    document.addEventListener('visibilitychange', readPermission)
    return () => {
      window.removeEventListener('focus', readPermission)
      document.removeEventListener('visibilitychange', readPermission)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    ensureServiceWorker().catch((error) => {
      console.error('Error registering service worker:', error)
    })
  }, [ensureServiceWorker])

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
      const registration = await ensureServiceWorker()
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
  }, [pushSupported, ensureServiceWorker])

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
    if (!pushSupported || !('Notification' in window)) return 'default'
    const result = await window.Notification.requestPermission()
    setPermission(result)
    return result
  }, [pushSupported])

  const subscribeToPush = useCallback(async () => {
    if (!pushSupported || !user) return false
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      setPushError('The app was built without NEXT_PUBLIC_VAPID_PUBLIC_KEY. Add it in Vercel and redeploy.')
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
      setPushError('The browser returned a push subscription without keys.')
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
      setPushError(`Could not save this device's subscription: ${error.message}`)
      return false
    }

    setPushEnabled(true)
    return true
  }, [pushSupported, user, supabase, ensureServiceWorker])

  const unsubscribeFromPush = useCallback(async () => {
    if (!pushSupported || !user) return
    const registration = await ensureServiceWorker()
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

  /**
   * Asks for permission and subscribes this device, reporting any failure in
   * pushError. Always asks the browser rather than trusting the last-known
   * permission, which can be stale.
   */
  const enablePush = useCallback(async () => {
    setPushError(null)
    if (!pushSupported || !('Notification' in window)) {
      setPushError('This browser does not support web notifications here.')
      return false
    }
    try {
      const result = await window.Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setPushError(
          result === 'denied'
            ? 'The browser answered "denied". Notifications are blocked for this site in the browser or system settings.'
            : 'No permission was given. The browser closed the request without an answer.',
        )
        return false
      }
      return await subscribeToPush()
    } catch (error) {
      console.error('Error enabling push:', error)
      setPushError(`Could not enable push: ${error instanceof Error ? error.message : String(error)}`)
      return false
    }
  }, [pushSupported, subscribeToPush])

  /** Sends a test notification to this account's devices; returns a result to show. */
  const sendTest = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'VibeBoard', body: 'Test notification delivered.', url: '/?from=notification' }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { ok: false, message: body.error ? `Server: ${body.error}` : `Server returned ${response.status}` }
      }
      if (body.failed > 0 && body.sent === 0) {
        return { ok: false, message: `The push service rejected all ${body.failed} device(s). Press Disable, then Enable Push.` }
      }
      return { ok: true, message: `Sent to ${body.sent} device${body.sent === 1 ? '' : 's'}${body.failed ? `, ${body.failed} failed` : ''}.` }
    } catch (error) {
      return { ok: false, message: `Could not reach the server: ${error instanceof Error ? error.message : String(error)}` }
    }
  }, [])

  return {
    settings,
    loading,
    pushSupported,
    pushEnabled,
    pushError,
    enablePush,
    sendTest,
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
