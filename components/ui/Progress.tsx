'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number // 0-100
  max?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'success' | 'warning' | 'danger' | 'accent'
  showLabel?: boolean
  animated?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  className,
  size = 'md',
  color = 'default',
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const colorClasses = {
    default: 'bg-[var(--accent)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--habit-partial)]',
    danger: 'bg-[var(--habit-missed)]',
    accent: 'bg-[var(--accent)]',
  }

  return (
    <div className={cn('relative', className)}>
      <div className={cn('w-full bg-[var(--bg-tertiary)] overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            colorClasses[color],
            animated && 'animate-progress-fill'
          )}
          style={{ '--progress': `${percentage}%`, width: animated ? undefined : `${percentage}%` } as React.CSSProperties}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-tertiary)] ml-2">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

interface ProgressRingProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  color?: string
  backgroundColor?: string
  showValue?: boolean
  animated?: boolean
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  className,
  color = 'var(--accent)',
  backgroundColor = 'var(--bg-tertiary)',
  showValue = true,
  animated = true,
}: ProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference : offset}
          strokeLinecap="round"
          className={animated ? 'animate-ring' : ''}
          style={{
            '--circumference': circumference,
            '--offset': offset,
          } as React.CSSProperties}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  )
}

interface ProgressStepsProps {
  current: number
  total: number
  className?: string
  size?: 'sm' | 'md'
}

export function ProgressSteps({ current, total, className, size = 'md' }: ProgressStepsProps) {
  const steps = Array.from({ length: total }, (_, i) => i + 1)

  const sizeClasses = {
    sm: { dot: 'w-2 h-2', line: 'h-0.5' },
    md: { dot: 'w-3 h-3', line: 'h-1' },
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              'rounded-full transition-colors',
              sizeClasses[size].dot,
              step <= current
                ? 'bg-[var(--accent)]'
                : 'bg-[var(--bg-tertiary)]'
            )}
          />
          {index < total - 1 && (
            <div
              className={cn(
                'w-4 transition-colors',
                sizeClasses[size].line,
                step < current
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--bg-tertiary)]'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
