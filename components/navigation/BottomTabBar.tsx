'use client'

import { useState } from 'react'
import { LayoutDashboard, Target, Flag, BookOpen, MoreHorizontal, ListChecks, Timer, Activity, Settings, X } from 'lucide-react'
import { useNavigation } from '@/contexts/NavigationContext'
import { ViewId } from '@/lib/types'
import { cn } from '@/lib/utils'

const PRIMARY_TABS: { id: ViewId | 'more'; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: 'board', icon: LayoutDashboard, label: 'Home' },
  { id: 'habits', icon: Target, label: 'Habits' },
  { id: 'goals', icon: Flag, label: 'Goals' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },
  { id: 'more', icon: MoreHorizontal, label: 'More' },
]

const MORE_ITEMS: { id: ViewId; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: 'routines', icon: ListChecks, label: 'Routines' },
  { id: 'focus', icon: Timer, label: 'Focus' },
  { id: 'activity', icon: Activity, label: 'Activity' },
]

interface BottomTabBarProps {
  onOpenSettings: () => void
}

export function BottomTabBar({ onOpenSettings }: BottomTabBarProps) {
  const { activeView, setActiveView } = useNavigation()
  const [showMore, setShowMore] = useState(false)

  const isSecondaryActive = MORE_ITEMS.some(item => item.id === activeView)

  const handleTabPress = (id: ViewId | 'more') => {
    if (id === 'more') {
      setShowMore(prev => !prev)
      return
    }
    setShowMore(false)
    setActiveView(id)
  }

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-elevated)] border-t border-[var(--border)] rounded-t-2xl" style={{ paddingBottom: 'calc(60px + var(--safe-area-bottom))' }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)] font-medium">More</span>
              <button onClick={() => setShowMore(false)} className="p-2 text-[var(--text-tertiary)]">
                <X size={16} />
              </button>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {MORE_ITEMS.map(item => {
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id)
                      setShowMore(false)
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] active:bg-[var(--bg-tertiary)]'
                    )}
                  >
                    <item.icon size={20} />
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </button>
                )
              })}
              <button
                onClick={() => {
                  onOpenSettings()
                  setShowMore(false)
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-[var(--text-secondary)] active:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Settings size={20} />
                <span className="text-[13px] font-medium">Settings</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] lg:hidden"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      >
        {PRIMARY_TABS.map(tab => {
          const isMore = tab.id === 'more'
          const isActive = isMore ? (showMore || isSecondaryActive) : activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabPress(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[52px] transition-colors',
                isActive
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] active:text-[var(--text-secondary)]'
              )}
            >
              <tab.icon size={20} />
              <span className="text-[10px] uppercase tracking-[0.1em] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
