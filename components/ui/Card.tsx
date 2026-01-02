'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  onClick?: () => void
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const variantClasses = {
    default: 'bg-[var(--bg-secondary)] border border-[var(--border)]',
    elevated: 'bg-[var(--bg-elevated)] border border-[var(--border)] shadow-lg shadow-black/20',
    bordered: 'bg-transparent border border-[var(--border)]',
    ghost: 'bg-transparent',
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'theme-transition',
        variantClasses[variant],
        paddingClasses[padding],
        hover && 'hover:border-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-2">{children}</div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

interface CardTitleProps {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function CardTitle({ children, className, size = 'md' }: CardTitleProps) {
  const sizeClasses = {
    sm: 'text-[11px] uppercase tracking-[0.1em]',
    md: 'text-[12px] uppercase tracking-[0.08em]',
    lg: 'text-sm font-medium',
  }

  return (
    <h3 className={cn(sizeClasses[size], 'text-[var(--text-secondary)]', className)}>
      {children}
    </h3>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-[var(--border-subtle)]', className)}>
      {children}
    </div>
  )
}
