'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { SectionHeader, Toggle, SettingsSection } from './shared'

interface NotificationsSectionProps {
  expanded: boolean
  onToggle: (section: SettingsSection) => void
  notificationSettings: {
    enabled: boolean
    daily_time: string
    quiet_start: string
    quiet_end: string
    channel_journal: boolean
    channel_habits: boolean
    channel_routines: boolean
    reminder_message: string
  } | null
  notificationsLoading: boolean
  pushSupported: boolean
  pushEnabled: boolean
  permission: NotificationPermission | 'default'
  timezone: string
  saveNotificationSettings: (updates: Record<string, unknown>) => void
  requestPermission: () => Promise<NotificationPermission>
  subscribeToPush: () => Promise<boolean | void>
  unsubscribeFromPush: () => Promise<boolean | void>
}

export function NotificationsSection({
  expanded, onToggle, notificationSettings, notificationsLoading,
  pushSupported, pushEnabled, permission, timezone,
  saveNotificationSettings, requestPermission, subscribeToPush, unsubscribeFromPush,
}: NotificationsSectionProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="notifications" icon={Bell} title="Notifications" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-3">
          <Toggle
            checked={!!notificationSettings?.enabled}
            onChange={(val) => saveNotificationSettings({ enabled: val })}
            label="Enable notifications"
          />

          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] text-[var(--text-secondary)]">Daily reminder</span>
            <input
              type="time"
              value={notificationSettings?.daily_time || '20:00'}
              onChange={(e) => saveNotificationSettings({ daily_time: e.target.value })}
              className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              disabled={notificationsLoading}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] text-[var(--text-secondary)]">Quiet hours</span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={notificationSettings?.quiet_start || '22:00'}
                onChange={(e) => saveNotificationSettings({ quiet_start: e.target.value })}
                className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                disabled={notificationsLoading}
              />
              <span className="text-[11px] text-[var(--text-tertiary)]">to</span>
              <input
                type="time"
                value={notificationSettings?.quiet_end || '07:00'}
                onChange={(e) => saveNotificationSettings({ quiet_end: e.target.value })}
                className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                disabled={notificationsLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Channels</p>
            <Toggle checked={!!notificationSettings?.channel_journal} onChange={(val) => saveNotificationSettings({ channel_journal: val })} label="Journal" />
            <Toggle checked={!!notificationSettings?.channel_habits} onChange={(val) => saveNotificationSettings({ channel_habits: val })} label="Habits" />
            <Toggle checked={!!notificationSettings?.channel_routines} onChange={(val) => saveNotificationSettings({ channel_routines: val })} label="Routines" />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Message</p>
            <input
              type="text"
              value={notificationSettings?.reminder_message || 'Time to journal?'}
              onChange={(e) => saveNotificationSettings({ reminder_message: e.target.value })}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              maxLength={120}
              disabled={notificationsLoading}
              placeholder="Reminder message..."
            />
            <p className="text-[10px] text-[var(--text-tertiary)]">{notificationSettings?.reminder_message?.length || 0}/120</p>
          </div>

          <p className="text-[10px] text-[var(--text-tertiary)]">
            Checks run every 15 minutes and send your daily reminder once within that window.
          </p>

          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] text-[var(--text-secondary)]">Timezone</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">{timezone}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] text-[var(--text-secondary)]">Push notifications</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {!pushSupported ? 'Unsupported' : pushEnabled ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not enabled'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                const result = await requestPermission()
                if (result === 'granted') await subscribeToPush()
              }}
              disabled={!pushSupported || permission === 'denied'}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enable Push
            </button>
            {pushEnabled && (
              <button onClick={unsubscribeFromPush} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                Disable
              </button>
            )}
            {pushEnabled && (
              <button
                onClick={async () => {
                  setTestStatus('sending')
                  try {
                    const response = await fetch('/api/notifications/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: 'VibeBoard', body: 'Test notification delivered.', url: '/?from=notification' }),
                    })
                    setTestStatus(response.ok ? 'sent' : 'error')
                  } catch {
                    setTestStatus('error')
                  }
                  setTimeout(() => setTestStatus('idle'), 2000)
                }}
                className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                {testStatus === 'sending' ? 'Sending...' : testStatus === 'sent' ? 'Sent' : testStatus === 'error' ? 'Failed' : 'Test'}
              </button>
            )}
          </div>

          {permission === 'denied' && (
            <p className="text-[10px] text-[var(--text-tertiary)]">Push is blocked in your browser settings.</p>
          )}
        </div>
      )}
    </div>
  )
}
