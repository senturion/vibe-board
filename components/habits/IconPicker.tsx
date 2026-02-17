'use client'

import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Dumbbell, Bike, Footprints, Heart, Activity,
  Moon, Sun, Droplets, Apple, Leaf,
  Book, BookOpen, Brain, Pencil, GraduationCap,
  Users, MessageCircle, Phone, HeartHandshake,
  Clock, Target, Zap, SquareCheck, ListTodo,
  Ban, ShieldOff, CircleOff, XCircle, Coffee, Wine, Cigarette, Smartphone,
} from 'lucide-react'
import { HABIT_ICON_GROUPS } from '@/lib/constants/habit-icons'
import { cn } from '@/lib/utils'

// Explicit map — Next.js tree-shakes `import *` for lucide-react
const ICON_MAP: Record<string, LucideIcon> = {
  dumbbell: Dumbbell, bike: Bike, footprints: Footprints, heart: Heart, activity: Activity,
  moon: Moon, sun: Sun, droplets: Droplets, apple: Apple, leaf: Leaf,
  book: Book, 'book-open': BookOpen, brain: Brain, pencil: Pencil, 'graduation-cap': GraduationCap,
  users: Users, 'message-circle': MessageCircle, phone: Phone, 'hand-heart': HeartHandshake,
  clock: Clock, target: Target, zap: Zap, 'check-square': SquareCheck, 'list-todo': ListTodo,
  ban: Ban, 'shield-x': ShieldOff, 'circle-off': CircleOff, 'x-circle': XCircle,
  coffee: Coffee, wine: Wine, cigarette: Cigarette, smartphone: Smartphone,
}

interface IconPickerProps {
  selected: string | undefined
  onSelect: (icon: string) => void
  color: string
}

function getIconComponent(name: string): LucideIcon | null {
  return ICON_MAP[name] || null
}

export function IconPicker({ selected, onSelect, color }: IconPickerProps) {
  const allIcons = useMemo(() => HABIT_ICON_GROUPS.flatMap(g => g.icons), [])

  return (
    <div className="flex flex-wrap gap-1.5">
      {allIcons.map((iconName) => {
        const Icon = getIconComponent(iconName)
        if (!Icon) return null

        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onSelect(iconName)}
            className={cn(
              'w-8 h-8 flex items-center justify-center transition-all rounded',
              selected === iconName
                ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-elevated)] scale-110'
                : 'hover:bg-[var(--bg-tertiary)]'
            )}
            style={{
              color: selected === iconName ? color : 'var(--text-secondary)',
              '--tw-ring-color': color,
            } as React.CSSProperties}
            title={iconName}
          >
            <Icon size={18} />
          </button>
        )
      })}
    </div>
  )
}

/** Render a habit icon by name. Reusable across calendar, cards, etc. */
export function HabitIcon({
  name,
  size = 14,
  color,
  className,
}: {
  name: string
  size?: number
  color?: string
  className?: string
}) {
  const Icon = getIconComponent(name)
  if (!Icon) return null
  return <Icon size={size} color={color} className={className} />
}
