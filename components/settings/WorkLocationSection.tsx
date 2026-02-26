'use client'

import { Building2, Home } from 'lucide-react'
import { DAYS_OF_WEEK, WorkLocation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AppSettings } from '@/hooks/useSettings'
import { SectionHeader, SettingsSection } from './shared'

interface WorkLocationSectionProps {
  expanded: boolean
  onToggle: (section: SettingsSection) => void
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function WorkLocationSection({ expanded, onToggle, settings, updateSetting }: WorkLocationSectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="workLocation" icon={Building2} title="Work Location" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-3">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Set your default work schedule. This will be applied when no specific day is set.
          </p>
          <div className="space-y-2">
            {DAYS_OF_WEEK.filter(d => d.id <= 5).map(day => (
              <div key={day.id} className="flex items-center justify-between py-1">
                <span className="text-[12px] text-[var(--text-secondary)]">{day.label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => updateSetting('defaultWorkSchedule', { ...settings.defaultWorkSchedule, [day.id]: null })}
                    className={cn(
                      'px-2 py-1 text-[9px] uppercase tracking-[0.05em] border transition-colors',
                      settings.defaultWorkSchedule[day.id] === null
                        ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] text-[var(--text-tertiary)]'
                    )}
                  >
                    None
                  </button>
                  <button
                    onClick={() => updateSetting('defaultWorkSchedule', { ...settings.defaultWorkSchedule, [day.id]: 'wfh' as WorkLocation })}
                    className={cn(
                      'px-2 py-1 text-[9px] uppercase tracking-[0.05em] border transition-colors flex items-center gap-1',
                      settings.defaultWorkSchedule[day.id] === 'wfh'
                        ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
                        : 'border-[var(--border)] text-[var(--text-tertiary)]'
                    )}
                  >
                    <Home size={10} /> WFH
                  </button>
                  <button
                    onClick={() => updateSetting('defaultWorkSchedule', { ...settings.defaultWorkSchedule, [day.id]: 'office' as WorkLocation })}
                    className={cn(
                      'px-2 py-1 text-[9px] uppercase tracking-[0.05em] border transition-colors flex items-center gap-1',
                      settings.defaultWorkSchedule[day.id] === 'office'
                        ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                        : 'border-[var(--border)] text-[var(--text-tertiary)]'
                    )}
                  >
                    <Building2 size={10} /> Office
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
