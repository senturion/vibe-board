'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import {
  Habit,
  HabitCategory,
  FrequencyType,
  DayOfWeek,
  DAYS_OF_WEEK,
  DAY_PRESETS,
  HABIT_COLORS,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface HabitEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (habit: Omit<Habit, 'id' | 'createdAt' | 'order'>) => void
  habit?: Habit // If provided, we're editing
  categories: HabitCategory[]
}

export function HabitEditor({
  isOpen,
  onClose,
  onSave,
  habit,
  categories,
}: HabitEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [frequencyValue, setFrequencyValue] = useState(3)
  const [specificDays, setSpecificDays] = useState<DayOfWeek[]>(DAY_PRESETS.weekdays)
  const [targetCount, setTargetCount] = useState(1)
  const [color, setColor] = useState(HABIT_COLORS[0])
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const syncTimeout = setTimeout(() => {
      if (habit) {
        setName(habit.name)
        setDescription(habit.description || '')
        setCategoryId(habit.categoryId)
        setFrequencyType(habit.frequencyType)
        setFrequencyValue(habit.frequencyValue)
        setSpecificDays(habit.specificDays || DAY_PRESETS.weekdays)
        setTargetCount(habit.targetCount)
        setColor(habit.color)
      } else {
        setName('')
        setDescription('')
        setCategoryId(undefined)
        setFrequencyType('daily')
        setFrequencyValue(3)
        setSpecificDays(DAY_PRESETS.weekdays)
        setTargetCount(1)
        setColor(HABIT_COLORS[0])
      }
      setTimeout(() => nameInputRef.current?.focus(), 100)
    }, 0)

    return () => clearTimeout(syncTimeout)
  }, [isOpen, habit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      categoryId,
      frequencyType,
      frequencyValue,
      specificDays: frequencyType === 'specific_days' ? specificDays : undefined,
      targetCount,
      isActive: true,
      color,
      icon: undefined,
    })

    onClose()
  }

  const toggleDay = (day: DayOfWeek) => {
    setSpecificDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const applyPreset = (preset: 'everyday' | 'weekdays' | 'weekends') => {
    setSpecificDays(DAY_PRESETS[preset])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-[var(--bg-elevated)] border border-[var(--border)] shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            {habit ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Habit Name
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Drink 8 glasses of water"
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
              placeholder="Why is this habit important to you?"
              rows={2}
              className="w-full bg-[var(--bg-tertiary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none border border-[var(--border)] focus:border-[var(--text-tertiary)] resize-none"
            />
          </div>

          {/* Frequency Type */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Frequency
            </label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'specific_days'] as FrequencyType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFrequencyType(type)}
                  className={cn(
                    'flex-1 px-3 py-2 text-[12px] border transition-colors',
                    frequencyType === type
                      ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  {type === 'daily' && 'Every Day'}
                  {type === 'weekly' && 'X per Week'}
                  {type === 'specific_days' && 'Specific Days'}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly frequency value */}
          {frequencyType === 'weekly' && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
                Times per week
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFrequencyValue(val)}
                    className={cn(
                      'w-8 h-8 text-[12px] border transition-colors',
                      frequencyValue === val
                        ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Specific days selector */}
          {frequencyType === 'specific_days' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                  Select Days
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
                    All
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
                      specificDays.includes(day.id)
                        ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                    )}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Target count */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Target per day
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTargetCount(val)}
                  className={cn(
                    'w-10 h-8 text-[12px] border transition-colors',
                    targetCount === val
                      ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {HABIT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 transition-all',
                    color === c && 'ring-2 ring-offset-2 ring-offset-[var(--bg-elevated)]'
                  )}
                  style={{
                    backgroundColor: c,
                    '--tw-ring-color': c,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2">
                Category (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryId(undefined)}
                  className={cn(
                    'px-3 py-1.5 text-[11px] border transition-colors',
                    !categoryId
                      ? 'bg-[var(--bg-tertiary)] border-[var(--text-tertiary)] text-[var(--text-primary)]'
                      : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                  )}
                >
                  None
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'px-3 py-1.5 text-[11px] border transition-colors',
                      categoryId === cat.id
                        ? 'border-[var(--text-tertiary)] text-[var(--text-primary)]'
                        : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-tertiary)]'
                    )}
                    style={{
                      backgroundColor: categoryId === cat.id ? `${cat.color}20` : undefined,
                      borderColor: categoryId === cat.id ? cat.color : undefined,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-[11px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50 hover:bg-[var(--accent-muted)] transition-colors"
            >
              {habit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
