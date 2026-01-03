'use client'

import { useState } from 'react'
import {
  X, Moon, Sun, LayoutList, LayoutGrid, RotateCcw,
  ChevronDown, ChevronUp, Home, Building2, Target,
  ListChecks, BookOpen, Timer, CalendarDays, Kanban
} from 'lucide-react'
import { ColumnId, COLUMNS, VIEWS, DAYS_OF_WEEK, WorkLocation } from '@/lib/types'
import { COLOR_PALETTE } from '@/hooks/useColumnColors'
import { useSettings, DEFAULT_SETTINGS } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  // Legacy props for backward compatibility
  isDark: boolean
  onToggleTheme: () => void
  compact: boolean
  onToggleCompact: () => void
  columnColors: Record<ColumnId, string>
  onColumnColorChange: (columnId: ColumnId, color: string) => void
  onResetColors: () => void
}

type SettingsSection = 'general' | 'board' | 'workLocation' | 'habits' | 'routines' | 'journal' | 'focus' | 'calendar'

export function SettingsPanel({
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
  compact,
  onToggleCompact,
  columnColors,
  onColumnColorChange,
  onResetColors,
}: SettingsPanelProps) {
  const { settings, updateSetting, resetSettings } = useSettings()
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>('general')
  const [expandedColumn, setExpandedColumn] = useState<ColumnId | null>(null)

  if (!isOpen) return null

  const toggleSection = (section: SettingsSection) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const SectionHeader = ({
    section,
    icon: Icon,
    title
  }: {
    section: SettingsSection
    icon: React.ElementType
    title: string
  }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-3 text-left"
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[var(--accent)]" />
        <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-secondary)] font-medium">
          {title}
        </span>
      </div>
      {expandedSection === section ? (
        <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
      ) : (
        <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
      )}
    </button>
  )

  const Toggle = ({
    checked,
    onChange,
    label
  }: {
    checked: boolean
    onChange: (val: boolean) => void
    label: string
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border)]'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )

  const NumberInput = ({
    value,
    onChange,
    label,
    min = 1,
    max = 999,
    suffix,
  }: {
    value: number
    onChange: (val: number) => void
    label: string
    min?: number
    max?: number
    suffix?: string
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value) || min
            onChange(Math.max(min, Math.min(max, val)))
          }}
          min={min}
          max={max}
          className="w-16 bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text-primary)] text-center outline-none focus:border-[var(--accent)]"
        />
        {suffix && <span className="text-[10px] text-[var(--text-tertiary)]">{suffix}</span>}
      </div>
    </div>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-[var(--bg-primary)] border-l border-[var(--border)] z-50 animate-slide-left flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="font-display text-lg text-[var(--text-primary)] italic">Settings</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
              className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <RotateCcw size={10} />
              Reset All
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-1">
            {/* General Section */}
            <div className="border-b border-[var(--border-subtle)]">
              <SectionHeader section="general" icon={Sun} title="General" />
              {expandedSection === 'general' && (
                <div className="pb-4 space-y-3">
                  {/* Theme */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Theme</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => isDark && onToggleTheme()}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2 border transition-colors',
                          !isDark
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                        )}
                      >
                        <Sun size={14} />
                        <span className="text-[10px] uppercase tracking-[0.1em]">Light</span>
                      </button>
                      <button
                        onClick={() => !isDark && onToggleTheme()}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2 border transition-colors',
                          isDark
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                        )}
                      >
                        <Moon size={14} />
                        <span className="text-[10px] uppercase tracking-[0.1em]">Dark</span>
                      </button>
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

            {/* Board/Kanban Section */}
            <div className="border-b border-[var(--border-subtle)]">
              <SectionHeader section="board" icon={Kanban} title="Board" />
              {expandedSection === 'board' && (
                <div className="pb-4 space-y-3">
                  {/* Card View */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">Card View</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => compact && onToggleCompact()}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2 border transition-colors',
                          !compact
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                        )}
                      >
                        <LayoutGrid size={14} />
                        <span className="text-[10px] uppercase tracking-[0.1em]">Full</span>
                      </button>
                      <button
                        onClick={() => !compact && onToggleCompact()}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2 border transition-colors',
                          compact
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                        )}
                      >
                        <LayoutList size={14} />
                        <span className="text-[10px] uppercase tracking-[0.1em]">Compact</span>
                      </button>
                    </div>
                  </div>

                  <Toggle
                    checked={settings.showArchivedTasks}
                    onChange={(val) => updateSetting('showArchivedTasks', val)}
                    label="Show archived tasks"
                  />

                  <Toggle
                    checked={settings.autoArchiveCompleted}
                    onChange={(val) => updateSetting('autoArchiveCompleted', val)}
                    label="Auto-archive completed tasks"
                  />

                  {settings.autoArchiveCompleted && (
                    <NumberInput
                      value={settings.archiveAfterDays}
                      onChange={(val) => updateSetting('archiveAfterDays', val)}
                      label="Archive after"
                      min={1}
                      max={30}
                      suffix="days"
                    />
                  )}

                  {/* Column Colors */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Column Colors</p>
                      <button
                        onClick={onResetColors}
                        className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="space-y-1">
                      {COLUMNS.map(column => (
                        <div key={column.id} className="relative">
                          <button
                            onClick={() => setExpandedColumn(expandedColumn === column.id ? null : column.id)}
                            className={cn(
                              'w-full flex items-center justify-between py-1.5 px-2 -mx-2 transition-colors',
                              expandedColumn === column.id ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-secondary)]'
                            )}
                          >
                            <span className="text-[11px] text-[var(--text-secondary)]">{column.title}</span>
                            <div
                              className="w-5 h-3 rounded-sm border border-white/20"
                              style={{ backgroundColor: columnColors[column.id] }}
                            />
                          </button>
                          {expandedColumn === column.id && (
                            <div className="flex flex-wrap gap-1 py-2 px-1">
                              {COLOR_PALETTE.map(color => (
                                <button
                                  key={color}
                                  onClick={() => {
                                    onColumnColorChange(column.id, color)
                                    setExpandedColumn(null)
                                  }}
                                  className={cn(
                                    'w-5 h-5 rounded-sm transition-all hover:scale-110',
                                    columnColors[column.id] === color && 'ring-2 ring-[var(--accent)]'
                                  )}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Work Location Section */}
            <div className="border-b border-[var(--border-subtle)]">
              <SectionHeader section="workLocation" icon={Building2} title="Work Location" />
              {expandedSection === 'workLocation' && (
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
                            onClick={() => {
                              const newSchedule = { ...settings.defaultWorkSchedule, [day.id]: null }
                              updateSetting('defaultWorkSchedule', newSchedule)
                            }}
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
                            onClick={() => {
                              const newSchedule = { ...settings.defaultWorkSchedule, [day.id]: 'wfh' as WorkLocation }
                              updateSetting('defaultWorkSchedule', newSchedule)
                            }}
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
                            onClick={() => {
                              const newSchedule = { ...settings.defaultWorkSchedule, [day.id]: 'office' as WorkLocation }
                              updateSetting('defaultWorkSchedule', newSchedule)
                            }}
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

            {/* Habits Section */}
            <div className="border-b border-[var(--border-subtle)]">
              <SectionHeader section="habits" icon={Target} title="Habits" />
              {expandedSection === 'habits' && (
                <div className="pb-4 space-y-2">
                  <NumberInput
                    value={settings.habitDefaultTarget}
                    onChange={(val) => updateSetting('habitDefaultTarget', val)}
                    label="Default target count"
                    min={1}
                    max={100}
                  />
                  <Toggle
                    checked={settings.showStreakNotifications}
                    onChange={(val) => updateSetting('showStreakNotifications', val)}
                    label="Show streak notifications"
                  />
                </div>
              )}
            </div>

            {/* Routines Section */}
            <div className="border-b border-[var(--border-subtle)]">
              <SectionHeader section="routines" icon={ListChecks} title="Routines" />
              {expandedSection === 'routines' && (
                <div className="pb-4 space-y-2">
                  <Toggle
                    checked={settings.routineAutoComplete}
                    onChange={(val) => updateSetting('routineAutoComplete', val)}
                    label="Auto-complete when all items done"
                  />
                  <Toggle
                    checked={settings.showRoutineTimeEstimates}
                    onChange={(val) => updateSetting('showRoutineTimeEstimates', val)}
                    label="Show time estimates"
                  />
                  <Toggle
                    checked={settings.routineReminderEnabled}
                    onChange={(val) => updateSetting('routineReminderEnabled', val)}
                    label="Enable routine reminders"
                  />
                </div>
              )}
            </div>

            {/* Journal Section */}
            <div className="border-b border-[var(--border-subtle)]">
              <SectionHeader section="journal" icon={BookOpen} title="Journal" />
              {expandedSection === 'journal' && (
                <div className="pb-4 space-y-2">
                  <Toggle
                    checked={settings.journalPromptsEnabled}
                    onChange={(val) => updateSetting('journalPromptsEnabled', val)}
                    label="Show writing prompts"
                  />
                  <Toggle
                    checked={settings.defaultMoodTracking}
                    onChange={(val) => updateSetting('defaultMoodTracking', val)}
                    label="Enable mood tracking"
                  />
                  <Toggle
                    checked={settings.journalAutoSave}
                    onChange={(val) => updateSetting('journalAutoSave', val)}
                    label="Auto-save entries"
                  />
                  {settings.journalAutoSave && (
                    <NumberInput
                      value={settings.journalAutoSaveInterval}
                      onChange={(val) => updateSetting('journalAutoSaveInterval', val)}
                      label="Auto-save interval"
                      min={5}
                      max={120}
                      suffix="sec"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Focus Timer Section */}
            <div className="border-b border-[var(--border-subtle)]">
              <SectionHeader section="focus" icon={Timer} title="Focus Timer" />
              {expandedSection === 'focus' && (
                <div className="pb-4 space-y-2">
                  <NumberInput
                    value={settings.focusWorkDuration}
                    onChange={(val) => updateSetting('focusWorkDuration', val)}
                    label="Work duration"
                    min={1}
                    max={120}
                    suffix="min"
                  />
                  <NumberInput
                    value={settings.focusShortBreakDuration}
                    onChange={(val) => updateSetting('focusShortBreakDuration', val)}
                    label="Short break"
                    min={1}
                    max={30}
                    suffix="min"
                  />
                  <NumberInput
                    value={settings.focusLongBreakDuration}
                    onChange={(val) => updateSetting('focusLongBreakDuration', val)}
                    label="Long break"
                    min={1}
                    max={60}
                    suffix="min"
                  />
                  <NumberInput
                    value={settings.focusSessionsUntilLongBreak}
                    onChange={(val) => updateSetting('focusSessionsUntilLongBreak', val)}
                    label="Sessions until long break"
                    min={1}
                    max={10}
                  />
                  <Toggle
                    checked={settings.focusAutoStartBreaks}
                    onChange={(val) => updateSetting('focusAutoStartBreaks', val)}
                    label="Auto-start breaks"
                  />
                  <Toggle
                    checked={settings.focusAutoStartWork}
                    onChange={(val) => updateSetting('focusAutoStartWork', val)}
                    label="Auto-start work sessions"
                  />
                  <Toggle
                    checked={settings.focusSoundEnabled}
                    onChange={(val) => updateSetting('focusSoundEnabled', val)}
                    label="Sound notifications"
                  />
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

            {/* Calendar Section */}
            <div>
              <SectionHeader section="calendar" icon={CalendarDays} title="Calendar" />
              {expandedSection === 'calendar' && (
                <div className="pb-4 space-y-2">
                  <Toggle
                    checked={settings.calendarShowWeekends}
                    onChange={(val) => updateSetting('calendarShowWeekends', val)}
                    label="Show weekends"
                  />
                  <Toggle
                    checked={settings.calendarDefaultMonthView}
                    onChange={(val) => updateSetting('calendarDefaultMonthView', val)}
                    label="Default to month view"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
          <p className="text-[9px] text-[var(--text-tertiary)] text-center">
            Settings are synced with your account
          </p>
        </div>
      </div>
    </>
  )
}
