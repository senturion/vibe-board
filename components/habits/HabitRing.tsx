import { ringArcs } from '@/lib/habitRing'
import { cn } from '@/lib/utils'

interface HabitRingProps {
  count: number
  target: number
  /** Fill colour for logged segments and the finished circle. */
  color?: string
  size?: number
  className?: string
}

/**
 * The one habit control used everywhere: a ring that fills a segment per log
 * and becomes a filled circle with a check when the day's target is met.
 * Decorative only; the button around it carries the label.
 */
export function HabitRing({ count, target, color = 'var(--accent)', size = 24, className }: HabitRingProps) {
  const complete = count >= Math.max(target, 1)
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
    >
      {complete ? (
        <>
          <circle cx="12" cy="12" r="10.5" fill={color} />
          <path
            d="M7.5 12.3l3 3 6-6.3"
            fill="none"
            stroke="var(--bg-secondary)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        ringArcs(count, target).map((a, i) => (
          <path
            key={i}
            d={a.d}
            fill="none"
            stroke={a.filled ? color : 'var(--text-tertiary)'}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ))
      )}
    </svg>
  )
}
