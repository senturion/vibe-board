'use client'

import { Sun } from 'lucide-react'
import { VIEWS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { THEMES, ThemeId } from '@/lib/themes'
import { AppSettings } from '@/hooks/useSettings'
import { SectionHeader, SettingsSection } from './shared'

interface GeneralSectionProps {
  expanded: boolean
  onToggle: (section: SettingsSection) => void
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  currentTheme: ThemeId
  onSetTheme: (theme: ThemeId) => void
}

export function GeneralSection({ expanded, onToggle, settings, updateSetting, currentTheme, onSetTheme }: GeneralSectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="general" icon={Sun} title="General" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-3">
          {/* Theme */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Theme</p>
            <div className="grid grid-cols-4 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSetTheme(t.id)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full overflow-hidden border-2 transition-all',
                      currentTheme === t.id
                        ? 'border-[var(--accent)] scale-110'
                        : 'border-transparent hover:border-[var(--text-tertiary)]'
                    )}
                  >
                    <div className="w-full h-full flex">
                      <div className="w-1/2 h-full" style={{ backgroundColor: t.colors.bg }} />
                      <div className="w-1/2 h-full" style={{ backgroundColor: t.colors.accent }} />
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[9px] uppercase tracking-[0.05em] transition-colors',
                      currentTheme === t.id
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'
                    )}
                  >
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Default View */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Default View</p>
            <select
              value={settings.defaultView}
              onChange={(e) => updateSetting('defaultView', e.target.value as typeof settings.defaultView)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            >
              {VIEWS.map(view => (
                <option key={view.id} value={view.id}>{view.title}</option>
              ))}
            </select>
          </div>

          {/* Week Starts On */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Week Starts On</p>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('weekStartsOn', 'monday')}
                className={cn(
                  'flex-1 py-2 border text-[10px] uppercase tracking-[0.1em] transition-colors',
                  settings.weekStartsOn === 'monday'
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                )}
              >
                Monday
              </button>
              <button
                onClick={() => updateSetting('weekStartsOn', 'sunday')}
                className={cn(
                  'flex-1 py-2 border text-[10px] uppercase tracking-[0.1em] transition-colors',
                  settings.weekStartsOn === 'sunday'
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                )}
              >
                Sunday
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
