'use client'

import { ReactNode } from 'react'
import {
  Inbox,
  Target,
  Flag,
  BookOpen,
  ListChecks,
  Timer,
  Plus,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

type IconName = 'inbox' | 'habits' | 'goals' | 'journal' | 'routines' | 'focus' | 'search'

const ICONS: Record<IconName, React.ComponentType<{ size?: number; className?: string }>> = {
  inbox: Inbox,
  habits: Target,
  goals: Flag,
  journal: BookOpen,
  routines: ListChecks,
  focus: Timer,
  search: Search,
}

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const Icon = ICONS[icon]

  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 32,
      title: 'text-[12px]',
      description: 'text-[11px]',
      button: 'px-3 py-1.5 text-[11px]',
    },
    md: {
      container: 'py-10',
      icon: 40,
      title: 'text-sm',
      description: 'text-[12px]',
      button: 'px-4 py-2 text-[12px]',
    },
    lg: {
      container: 'py-16',
      icon: 56,
      title: 'text-base',
      description: 'text-sm',
      button: 'px-5 py-2.5 text-sm',
    },
  }

  const sizes = sizeClasses[size]

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', sizes.container, className)}>
      {Icon && (
        <div className="mb-4 p-4 bg-[var(--bg-tertiary)] border border-[var(--border)]">
          <Icon size={sizes.icon} className="text-[var(--text-tertiary)]" />
        </div>
      )}
      <h3 className={cn(sizes.title, 'font-medium text-[var(--text-secondary)] mb-1')}>
        {title}
      </h3>
      {description && (
        <p className={cn(sizes.description, 'text-[var(--text-tertiary)] max-w-xs mb-4')}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'flex items-center gap-2 bg-[var(--accent)] text-[var(--bg-primary)] uppercase tracking-[0.1em] font-medium hover:bg-[var(--accent-muted)] transition-colors',
            sizes.button
          )}
        >
          <Plus size={14} />
          {action.label}
        </button>
      )}
    </div>
  )
}

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10', className)}>
      <div className="flex gap-1 mb-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-[var(--accent)] animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-[12px] text-[var(--text-tertiary)]">{message}</p>
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  retry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10 text-center', className)}>
      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20">
        <span className="text-2xl">!</span>
      </div>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</h3>
      {message && (
        <p className="text-[12px] text-[var(--text-tertiary)] max-w-xs mb-4">{message}</p>
      )}
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 text-[12px] uppercase tracking-[0.1em] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
