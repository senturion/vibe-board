'use client'

import {
  Angry,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Laugh,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type MoodValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const MOOD_OPTIONS: {
  value: MoodValue
  label: string
  description: string
  color: string
  icon: typeof Angry
}[] = [
  { value: 1, label: 'Rough', description: 'Overwhelmed', color: 'var(--journal-mood-1)', icon: Angry },
  { value: 2, label: 'Low', description: 'Down', color: 'var(--journal-mood-2)', icon: Frown },
  { value: 3, label: 'Anxious', description: 'Uneasy', color: 'var(--journal-mood-3)', icon: Meh },
  { value: 5, label: 'Meh', description: 'Flat', color: 'var(--journal-mood-4)', icon: Meh },
  { value: 7, label: 'Okay', description: 'Steady', color: 'var(--journal-mood-5)', icon: Smile },
  { value: 9, label: 'Good', description: 'Positive', color: 'var(--journal-mood-6)', icon: SmilePlus },
  { value: 10, label: 'Great', description: 'Cheery', color: 'var(--journal-mood-7)', icon: Laugh },
]

export const getMoodOption = (value?: number) => MOOD_OPTIONS.find(option => option.value === value)

export function MoodPlaceholderIcon({ size = 14, className }: { size?: number; className?: string }) {
  return <Meh size={size} className={cn('text-[var(--text-tertiary)]', className)} />
}

export function MoodIcon({
  mood,
  size = 14,
  className,
}: {
  mood?: number
  size?: number
  className?: string
}) {
  const data = getMoodOption(mood)
  if (!data) return null
  const Icon = data.icon

  return <Icon size={size} className={cn(className)} style={{ color: data.color }} />
}
