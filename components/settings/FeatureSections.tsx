'use client'

import { Target, ListChecks, BookOpen, Timer, CalendarDays } from 'lucide-react'
import { AppSettings } from '@/hooks/useSettings'
import { SectionHeader, Toggle, NumberInput, SettingsSection } from './shared'

interface FeatureSectionProps {
  expanded: boolean
  onToggle: (section: SettingsSection) => void
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

export function HabitsSection({ expanded, onToggle, settings, updateSetting }: FeatureSectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="habits" icon={Target} title="Habits" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-2">
          <NumberInput value={settings.habitDefaultTarget} onChange={(val) => updateSetting('habitDefaultTarget', val)} label="Default target count" min={1} max={100} />
          <Toggle checked={settings.showStreakNotifications} onChange={(val) => updateSetting('showStreakNotifications', val)} label="Show streak notifications" />
        </div>
      )}
    </div>
  )
}

export function RoutinesSection({ expanded, onToggle, settings, updateSetting }: FeatureSectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="routines" icon={ListChecks} title="Routines" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-2">
          <Toggle checked={settings.routineAutoComplete} onChange={(val) => updateSetting('routineAutoComplete', val)} label="Auto-complete when all items done" />
          <Toggle checked={settings.showRoutineTimeEstimates} onChange={(val) => updateSetting('showRoutineTimeEstimates', val)} label="Show time estimates" />
          <Toggle checked={settings.routineReminderEnabled} onChange={(val) => updateSetting('routineReminderEnabled', val)} label="Enable routine reminders" />
        </div>
      )}
    </div>
  )
}

export function JournalSection({ expanded, onToggle, settings, updateSetting }: FeatureSectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="journal" icon={BookOpen} title="Journal" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-2">
          <Toggle checked={settings.journalPromptsEnabled} onChange={(val) => updateSetting('journalPromptsEnabled', val)} label="Show writing prompts" />
          <Toggle checked={settings.defaultMoodTracking} onChange={(val) => updateSetting('defaultMoodTracking', val)} label="Enable mood tracking" />
          <Toggle checked={settings.journalAutoSave} onChange={(val) => updateSetting('journalAutoSave', val)} label="Auto-save entries" />
          {settings.journalAutoSave && (
            <NumberInput value={settings.journalAutoSaveInterval} onChange={(val) => updateSetting('journalAutoSaveInterval', val)} label="Auto-save interval" min={5} max={120} suffix="sec" />
          )}
        </div>
      )}
    </div>
  )
}

export function FocusSection({ expanded, onToggle, settings, updateSetting }: FeatureSectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)]">
      <SectionHeader section="focus" icon={Timer} title="Focus Timer" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-2">
          <NumberInput value={settings.focusWorkDuration} onChange={(val) => updateSetting('focusWorkDuration', val)} label="Work duration" min={1} max={120} suffix="min" />
          <NumberInput value={settings.focusShortBreakDuration} onChange={(val) => updateSetting('focusShortBreakDuration', val)} label="Short break" min={1} max={30} suffix="min" />
          <NumberInput value={settings.focusLongBreakDuration} onChange={(val) => updateSetting('focusLongBreakDuration', val)} label="Long break" min={1} max={60} suffix="min" />
          <NumberInput value={settings.focusSessionsUntilLongBreak} onChange={(val) => updateSetting('focusSessionsUntilLongBreak', val)} label="Sessions until long break" min={1} max={10} />
          <Toggle checked={settings.focusAutoStartBreaks} onChange={(val) => updateSetting('focusAutoStartBreaks', val)} label="Auto-start breaks" />
          <Toggle checked={settings.focusAutoStartWork} onChange={(val) => updateSetting('focusAutoStartWork', val)} label="Auto-start work sessions" />
          <Toggle checked={settings.focusSoundEnabled} onChange={(val) => updateSetting('focusSoundEnabled', val)} label="Sound notifications" />
          {settings.focusSoundEnabled && (
            <div className="flex items-center justify-between py-2">
              <span className="text-[12px] text-[var(--text-secondary)]">Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.focusSoundVolume}
                onChange={(e) => updateSetting('focusSoundVolume', parseInt(e.target.value))}
                className="w-24 accent-[var(--accent)]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CalendarSection({ expanded, onToggle, settings, updateSetting }: FeatureSectionProps) {
  return (
    <div>
      <SectionHeader section="calendar" icon={CalendarDays} title="Calendar" expanded={expanded} onToggle={onToggle} />
      {expanded && (
        <div className="pb-4 space-y-2">
          <Toggle checked={settings.calendarShowWeekends} onChange={(val) => updateSetting('calendarShowWeekends', val)} label="Show weekends" />
          <Toggle checked={settings.calendarDefaultMonthView} onChange={(val) => updateSetting('calendarDefaultMonthView', val)} label="Default to month view" />
        </div>
      )}
    </div>
  )
}
