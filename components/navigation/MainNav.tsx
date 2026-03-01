'use client'

import { LayoutDashboard, Columns3, Target, Flag, BookOpen, ListChecks, Timer, Activity } from 'lucide-react'
import { useNavigation } from '@/contexts/NavigationContext'
import { ViewId, VIEWS } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Columns3,
  Target,
  Flag,
  BookOpen,
  ListChecks,
  Timer,
  Activity,
}

interface MainNavProps {
  className?: string
  compact?: boolean
}

export function MainNav({ className, compact = false }: MainNavProps) {
  const { activeView, setActiveView, isTransitioning } = useNavigation()

  return (
    <nav className={cn('flex items-center', className)}>
      <div className={cn(
        'flex items-center bg-[var(--bg-secondary)] border border-[var(--border)]',
        compact ? 'gap-0.5 p-0.5' : 'gap-1 p-1'
      )}>
        {VIEWS.map((view) => {
          const Icon = ICON_MAP[view.icon]
          const isActive = activeView === view.id

          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              disabled={isTransitioning}
              className={cn(
                'flex items-center gap-2 transition-all duration-150',
                compact ? 'px-2 py-1.5' : 'px-3 py-1.5',
                isActive
                  ? 'bg-[var(--bg-tertiary)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-transparent',
                isTransitioning && 'opacity-75 cursor-wait'
              )}
              title={view.title}
            >
              {Icon && <Icon size={compact ? 14 : 16} />}
              {!compact && (
                <span className="text-[11px] uppercase tracking-[0.1em] font-medium">
                  {view.title}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
// Individual nav item for custom layouts
interface NavItemProps {
  viewId: ViewId
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function NavItem({ viewId, className, showLabel = true, size = 'md' }: NavItemProps) {
  const { activeView, setActiveView, isTransitioning } = useNavigation()
  const view = VIEWS.find(v => v.id === viewId)
  if (!view) return null

  const Icon = ICON_MAP[view.icon]
  const isActive = activeView === viewId

  const sizeClasses = {
    sm: { icon: 12, padding: 'px-2 py-1', text: 'text-[10px]' },
    md: { icon: 14, padding: 'px-3 py-1.5', text: 'text-[11px]' },
    lg: { icon: 16, padding: 'px-4 py-2', text: 'text-[12px]' },
  }

  const { icon: iconSize, padding, text } = sizeClasses[size]

  return (
    <button
      onClick={() => setActiveView(viewId)}
      disabled={isTransitioning}
      className={cn(
        'flex items-center gap-2 transition-all duration-150 border',
        padding,
        isActive
          ? 'bg-[var(--bg-tertiary)] text-[var(--accent)] border-[var(--accent-muted)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]',
        isTransitioning && 'opacity-75 cursor-wait',
        className
      )}
      title={view.title}
    >
      {Icon && <Icon size={iconSize} />}
      {showLabel && (
        <span className={cn(text, 'uppercase tracking-[0.1em] font-medium')}>
          {view.title}
        </span>
      )}
    </button>
  )
}
