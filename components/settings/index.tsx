'use client'

import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { ColumnId } from '@/lib/types'
import { useSettings } from '@/hooks/useSettings'
import { useNotifications } from '@/hooks/useNotifications'
import { ThemeId } from '@/lib/themes'
import { SettingsSection } from './shared'
import { GeneralSection } from './GeneralSection'
import { AISection } from './AISection'
import { BoardSection } from './BoardSection'
import { NotificationsSection } from './NotificationsSection'
import { WorkLocationSection } from './WorkLocationSection'
import { HabitsSection, RoutinesSection, JournalSection, FocusSection, CalendarSection } from './FeatureSections'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  currentTheme: ThemeId
  onSetTheme: (theme: ThemeId) => void
  compact: boolean
  onToggleCompact: () => void
  columnColors: Record<ColumnId, string>
  onColumnColorChange: (columnId: ColumnId, color: string) => void
  onResetColors: () => void
}

export function SettingsPanel({
  isOpen, onClose, isDark, currentTheme, onSetTheme,
  compact, onToggleCompact, columnColors, onColumnColorChange, onResetColors,
}: SettingsPanelProps) {
  const { settings, updateSetting, resetSettings } = useSettings()
  const {
    settings: notificationSettings,
    loading: notificationsLoading,
    pushSupported, pushEnabled, permission, timezone,
    saveSettings: saveNotificationSettings,
    requestPermission, subscribeToPush, unsubscribeFromPush,
  } = useNotifications()
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>('general')

  if (!isOpen) return null

  const toggleSection = (section: SettingsSection) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const sectionProps = { settings, updateSetting } as const

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />

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
              <RotateCcw size={10} /> Reset All
            </button>
            <button onClick={onClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-1">
            <GeneralSection expanded={expandedSection === 'general'} onToggle={toggleSection} {...sectionProps} currentTheme={currentTheme} onSetTheme={onSetTheme} />
            <AISection expanded={expandedSection === 'ai'} onToggle={toggleSection} {...sectionProps} />
            <BoardSection expanded={expandedSection === 'board'} onToggle={toggleSection} {...sectionProps} compact={compact} onToggleCompact={onToggleCompact} columnColors={columnColors} onColumnColorChange={onColumnColorChange} onResetColors={onResetColors} />
            <NotificationsSection
              expanded={expandedSection === 'notifications'} onToggle={toggleSection}
              notificationSettings={notificationSettings} notificationsLoading={notificationsLoading}
              pushSupported={pushSupported} pushEnabled={pushEnabled} permission={permission} timezone={timezone}
              saveNotificationSettings={saveNotificationSettings} requestPermission={requestPermission}
              subscribeToPush={subscribeToPush} unsubscribeFromPush={unsubscribeFromPush}
            />
            <WorkLocationSection expanded={expandedSection === 'workLocation'} onToggle={toggleSection} {...sectionProps} />
            <HabitsSection expanded={expandedSection === 'habits'} onToggle={toggleSection} {...sectionProps} />
            <RoutinesSection expanded={expandedSection === 'routines'} onToggle={toggleSection} {...sectionProps} />
            <JournalSection expanded={expandedSection === 'journal'} onToggle={toggleSection} {...sectionProps} />
            <FocusSection expanded={expandedSection === 'focus'} onToggle={toggleSection} {...sectionProps} />
            <CalendarSection expanded={expandedSection === 'calendar'} onToggle={toggleSection} {...sectionProps} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
          <p className="text-[9px] text-[var(--text-tertiary)] text-center">Settings are synced with your account</p>
        </div>
      </div>
    </>
  )
}
