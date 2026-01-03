'use client'

import { Home, Building2 } from 'lucide-react'
import { WorkLocation } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RoutineLocationBadgeProps {
  location?: WorkLocation
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function RoutineLocationBadge({
  location,
  size = 'sm',
  showLabel = false,
}: RoutineLocationBadgeProps) {
  if (!location) return null

  const isWfh = location === 'wfh'
  const iconSize = size === 'sm' ? 10 : 12
  const label = isWfh ? 'WFH' : 'Office'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
        isWfh
          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      )}
    >
      {isWfh ? <Home size={iconSize} /> : <Building2 size={iconSize} />}
      {showLabel && <span>{label}</span>}
    </span>
  )
}
