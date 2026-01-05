'use client'

import { useState } from 'react'
import { MOOD_OPTIONS, MoodIcon, MoodPlaceholderIcon, getMoodOption } from './moods'
import { cn } from '@/lib/utils'

interface MoodPickerProps {
  value?: number
  onChange: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
}

export function MoodPicker({ value, onChange, size = 'md' }: MoodPickerProps) {
  const [showPicker, setShowPicker] = useState(false)

  const currentMood = getMoodOption(value)

  const sizeClasses = {
    sm: { button: 'p-1.5 text-sm' },
    md: { button: 'p-2 text-lg' },
    lg: { button: 'p-3 text-2xl' },
  }
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18

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
        title={currentMood ? `${currentMood.label} · ${currentMood.description}` : 'Set mood'}
      >
        {currentMood ? (
          <MoodIcon mood={currentMood.value} size={iconSize} />
        ) : (
          <MoodPlaceholderIcon size={iconSize} />
        )}
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute right-0 bottom-full mb-2 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl z-20 p-3 min-w-[420px]">
            <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mb-2 px-1">
              How are you feeling?
            </p>
            <div className="grid grid-cols-7 gap-2 w-full">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => {
                    onChange(mood.value)
                    setShowPicker(false)
                  }}
                  className={cn(
                    'w-full min-w-[52px] p-2 transition-all border border-transparent',
                    value === mood.value
                      ? 'bg-[var(--accent-glow)] scale-105 border-[var(--accent-muted)]'
                      : 'hover:bg-[var(--bg-tertiary)] hover:scale-105'
                  )}
                  title={`${mood.label} · ${mood.description}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <MoodIcon mood={mood.value} size={18} />
                    <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] whitespace-nowrap">
                      {mood.label}
                    </span>
                    <span className="text-[9px] text-[var(--text-tertiary)]">
                      {mood.value}
                    </span>
                  </div>
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
  const moodData = getMoodOption(mood)
  if (!moodData) return null

  const sizeClasses = {
    sm: 12,
    md: 16,
    lg: 20,
  }

  return (
    <span className="inline-flex items-center gap-1">
      <MoodIcon mood={mood} size={sizeClasses[size]} />
      {showLabel && (
        <span className="text-[11px] text-[var(--text-tertiary)]">{moodData.label}</span>
      )}
    </span>
  )
}
