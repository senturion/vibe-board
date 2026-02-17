'use client'

import { useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import { HABIT_ICON_GROUPS } from '@/lib/constants/habit-icons'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  selected: string | undefined
  onSelect: (icon: string) => void
  color: string
}

/** Convert kebab-case icon name to PascalCase component name */
function getIconComponent(name: string): LucideIcons.LucideIcon | null {
  const pascalCase = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const icon = (LucideIcons as Record<string, unknown>)[pascalCase]
  return (typeof icon === 'function' ? icon : null) as LucideIcons.LucideIcon | null
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
