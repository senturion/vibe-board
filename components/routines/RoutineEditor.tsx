'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Routine, DayOfWeek, DAYS_OF_WEEK, DAY_PRESETS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RoutineEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, daysOfWeek: DayOfWeek[], description?: string) => void
  routine?: Routine
}

export function RoutineEditor({
  isOpen,
  onClose,
  onSave,
  routine,
}: RoutineEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(DAY_PRESETS.everyday)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (routine) {
        setName(routine.name)
        setDescription(routine.description || '')
        setDaysOfWeek(routine.daysOfWeek)
      } else {
        setName('')
        setDescription('')
        setDaysOfWeek(DAY_PRESETS.everyday)
      }
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }
  }, [isOpen, routine])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || daysOfWeek.length === 0) return

    onSave(name.trim(), daysOfWeek, description.trim() || undefined)
    onClose()
  }

  const toggleDay = (day: DayOfWeek) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const applyPreset = (preset: 'everyday' | 'weekdays' | 'weekends') => {
    setDaysOfWeek(DAY_PRESETS[preset])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            {routine ? 'Edit Routine' : 'New Routine'}
          </h2>
          <button onClick={onClose} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Routine Name
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Routine"
              className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this routine for?"
              rows={2}
              className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)] resize-none"
            />
          </div>

          {/* Days of Week */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                Active Days
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('weekdays')}
                  className="text-[10px] text-[var(--accent)] hover:underline"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('weekends')}
                  className="text-[10px] text-[var(--accent)] hover:underline"
                >
                  Weekends
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('everyday')}
                  className="text-[10px] text-[var(--accent)] hover:underline"
                >
                  Every day
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={cn(
                    'flex-1 py-2 text-[11px] border transition-colors',
                    daysOfWeek.includes(day.id)
                      ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  {day.short}
                </button>
              ))}
            </div>
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
              type="submit"
              disabled={!name.trim() || daysOfWeek.length === 0}
              className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50 hover:bg-[var(--accent-muted)]"
            >
              {routine ? 'Save Changes' : 'Create Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
