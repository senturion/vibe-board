'use client'

import { useState } from 'react'
import { MOOD_EMOJIS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MoodPickerProps {
  value?: number
  onChange: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
}

export function MoodPicker({ value, onChange, size = 'md' }: MoodPickerProps) {
  const [showPicker, setShowPicker] = useState(false)

  const currentMood = MOOD_EMOJIS.find(m => m.value === value)

  const sizeClasses = {
    sm: { button: 'p-1.5 text-sm', picker: 'text-lg' },
    md: { button: 'p-2 text-lg', picker: 'text-xl' },
    lg: { button: 'p-3 text-2xl', picker: 'text-2xl' },
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          'border transition-colors',
          sizeClasses[size].button,
          value
            ? 'border-[var(--accent-muted)] bg-[var(--accent-glow)]'
            : 'border-[var(--border)] hover:border-[var(--text-tertiary)] text-[var(--text-tertiary)]'
        )}
        title={currentMood ? currentMood.label : 'Set mood'}
      >
        {currentMood ? currentMood.emoji : '😶'}
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute right-0 top-full mt-2 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl z-20 p-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2 px-1">
              How are you feeling?
            </p>
            <div className="flex gap-1">
              {MOOD_EMOJIS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => {
                    onChange(mood.value)
                    setShowPicker(false)
                  }}
                  className={cn(
                    'p-2 transition-all',
                    sizeClasses[size].picker,
                    value === mood.value
                      ? 'bg-[var(--accent-glow)] scale-110'
                      : 'hover:bg-[var(--bg-tertiary)] hover:scale-105'
                  )}
                  title={mood.label}
                >
                  {mood.emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface MoodDisplayProps {
  mood: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function MoodDisplay({ mood, size = 'md', showLabel = false }: MoodDisplayProps) {
  const moodData = MOOD_EMOJIS.find(m => m.value === mood)
  if (!moodData) return null

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  }

  return (
    <span className={cn('inline-flex items-center gap-1', sizeClasses[size])}>
      <span>{moodData.emoji}</span>
      {showLabel && (
        <span className="text-[11px] text-[var(--text-tertiary)]">{moodData.label}</span>
      )}
    </span>
  )
}
