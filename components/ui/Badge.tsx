'use client'

import { ReactNode } from 'react'
import { Flame, Trophy, Star, Zap, Target } from 'lucide-react'
import { MoodIcon, MoodValue, getMoodOption } from '@/components/journal/moods'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'muted'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)]',
    success: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30',
    warning: 'bg-[var(--habit-partial)]/15 text-[var(--habit-partial)] border-[var(--habit-partial)]/30',
    danger: 'bg-[var(--habit-missed)]/15 text-[var(--habit-missed)] border-[var(--habit-missed)]/30',
    accent: 'bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent-muted)]/30',
    muted: 'bg-transparent text-[var(--text-tertiary)] border-[var(--border-subtle)]',
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-[11px]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border uppercase tracking-[0.05em] font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  )
}

interface StreakBadgeProps {
  count: number
  isBest?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  animated?: boolean
}

export function StreakBadge({
  count,
  isBest = false,
  size = 'md',
  className,
  animated = true,
}: StreakBadgeProps) {
  const sizeClasses = {
    sm: { container: 'px-2 py-1 gap-1', icon: 12, text: 'text-[10px]' },
    md: { container: 'px-2.5 py-1.5 gap-1.5', icon: 14, text: 'text-[11px]' },
    lg: { container: 'px-3 py-2 gap-2', icon: 16, text: 'text-[12px]' },
  }

  const sizes = sizeClasses[size]

  if (count === 0) {
    return (
      <span className={cn('inline-flex items-center text-[var(--text-tertiary)]', sizes.container, sizes.text, className)}>
        No streak
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        isBest
          ? 'bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent-muted)]/30'
          : 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30',
        sizes.container,
        className
      )}
    >
      <Flame
        size={sizes.icon}
        className={cn(animated && count >= 7 && 'animate-flame')}
      />
      <span className={sizes.text}>{count} day{count !== 1 ? 's' : ''}</span>
      {isBest && <Trophy size={sizes.icon - 2} className="ml-1" />}
    </span>
  )
}

interface StatBadgeProps {
  value: number | string
  label: string
  icon?: 'star' | 'zap' | 'target' | 'trophy'
  variant?: 'default' | 'accent'
  className?: string
}

export function StatBadge({
  value,
  label,
  icon,
  variant = 'default',
  className,
}: StatBadgeProps) {
  const icons = {
    star: Star,
    zap: Zap,
    target: Target,
    trophy: Trophy,
  }

  const Icon = icon ? icons[icon] : null

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 border',
        variant === 'accent'
          ? 'bg-[var(--accent-glow)] border-[var(--accent-muted)]/30'
          : 'bg-[var(--bg-tertiary)] border-[var(--border)]',
        className
      )}
    >
      {Icon && (
        <Icon
          size={16}
          className={variant === 'accent' ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}
        />
      )}
      <div className="flex flex-col">
        <span
          className={cn(
            'text-sm font-medium',
            variant === 'accent' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
          )}
        >
          {value}
        </span>
        <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          {label}
        </span>
      </div>
    </div>
  )
}

interface MoodBadgeProps {
  mood: MoodValue
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MoodBadge({ mood, showLabel = false, size = 'md', className }: MoodBadgeProps) {
  const data = getMoodOption(mood)
  if (!data) return null

  const sizeClasses = {
    sm: { icon: 12, label: 'text-[10px]' },
    md: { icon: 16, label: 'text-[11px]' },
    lg: { icon: 20, label: 'text-[12px]' },
  }

  const sizes = sizeClasses[size]

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      style={{ color: data.color }}
    >
      <MoodIcon mood={mood} size={sizes.icon} />
      {showLabel && (
        <span className={cn(sizes.label, 'font-medium')}>{data.label}</span>
      )}
    </span>
  )
}
