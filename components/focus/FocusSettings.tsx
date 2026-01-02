'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { FocusSettings as FocusSettingsType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FocusSettingsProps {
  isOpen: boolean
  onClose: () => void
  settings: FocusSettingsType
  onSave: (settings: Partial<FocusSettingsType>) => void
}

export function FocusSettings({ isOpen, onClose, settings, onSave }: FocusSettingsProps) {
  const [workDuration, setWorkDuration] = useState(settings.workDuration)
  const [shortBreakDuration, setShortBreakDuration] = useState(settings.shortBreakDuration)
  const [longBreakDuration, setLongBreakDuration] = useState(settings.longBreakDuration)
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(settings.sessionsUntilLongBreak)
  const [autoStartBreaks, setAutoStartBreaks] = useState(settings.autoStartBreaks)
  const [autoStartWork, setAutoStartWork] = useState(settings.autoStartWork)
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled)

  useEffect(() => {
    if (isOpen) {
      setWorkDuration(settings.workDuration)
      setShortBreakDuration(settings.shortBreakDuration)
      setLongBreakDuration(settings.longBreakDuration)
      setSessionsUntilLongBreak(settings.sessionsUntilLongBreak)
      setAutoStartBreaks(settings.autoStartBreaks)
      setAutoStartWork(settings.autoStartWork)
      setSoundEnabled(settings.soundEnabled)
    }
  }, [isOpen, settings])

  const handleSave = () => {
    onSave({
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      sessionsUntilLongBreak,
      autoStartBreaks,
      autoStartWork,
      soundEnabled,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Timer Settings</h2>
          <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Durations */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-3">
              Durations (minutes)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Work</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={workDuration}
                  onChange={(e) => setWorkDuration(parseInt(e.target.value) || 25)}
                  className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Short Break</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(parseInt(e.target.value) || 5)}
                  className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Long Break</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(parseInt(e.target.value) || 15)}
                  className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
                />
              </div>
            </div>
          </div>

          {/* Sessions until long break */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Sessions until long break
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSessionsUntilLongBreak(num)}
                  className={cn(
                    'flex-1 py-2 text-[12px] border transition-colors',
                    sessionsUntilLongBreak === num
                      ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[12px] text-[var(--text-secondary)]">Auto-start breaks</span>
              <button
                type="button"
                onClick={() => setAutoStartBreaks(!autoStartBreaks)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  autoStartBreaks ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    autoStartBreaks ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[12px] text-[var(--text-secondary)]">Auto-start work sessions</span>
              <button
                type="button"
                onClick={() => setAutoStartWork(!autoStartWork)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  autoStartWork ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    autoStartWork ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[12px] text-[var(--text-secondary)]">Sound notifications</span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative',
                  soundEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    soundEnabled ? 'left-5' : 'left-0.5'
                  )}
                />
              </button>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-muted)]"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
