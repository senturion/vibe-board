'use client'

import { useMemo } from 'react'
import { Building2, Home, Loader2 } from 'lucide-react'
import { useWorkLocation } from '@/contexts/WorkLocationContext'
import { WorkLocation, WORK_LOCATIONS, formatDateKey } from '@/lib/types'
import { cn } from '@/lib/utils'

export function WorkLocationWidget() {
  const { loading, getWeekLocations, setLocationForDate, getTodaysLocation } = useWorkLocation()

  const weekLocations = useMemo(() => getWeekLocations(), [getWeekLocations])
  const todaysLocation = getTodaysLocation()
  const todayKey = formatDateKey()

  const handleToggle = async (date: string, currentLocation: WorkLocation | null) => {
    // Cycle through: null -> wfh -> office -> wfh ...
    const nextLocation: WorkLocation = currentLocation === 'wfh' ? 'office' : 'wfh'
    await setLocationForDate(date, nextLocation)
  }

  if (loading) {
    return (
      <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center">
        <Loader2 size={16} className="text-[var(--text-tertiary)] animate-spin" />
      </div>
    )
  }

  const todayInfo = todaysLocation
    ? WORK_LOCATIONS.find(l => l.id === todaysLocation)
    : null

  return (
    <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
      {/* Week view */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          This Week
        </span>
      </div>

      <div className="flex items-center gap-1 mb-3">
        {weekLocations.map(({ date, dayName, location }) => {
          const isToday = date === todayKey
          const isWfh = location === 'wfh'
          const isOffice = location === 'office'

          return (
            <button
              key={date}
              onClick={() => handleToggle(date, location)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 px-1 transition-all',
                'border',
                isToday && 'ring-1 ring-[var(--accent)]',
                location
                  ? isWfh
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-tertiary)]'
              )}
              title={`${dayName}: ${location ? (isWfh ? 'Work from Home' : 'Office') : 'Not set'}`}
            >
              <span className={cn(
                'text-[9px] font-medium',
                isToday ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
              )}>
                {dayName}
              </span>
              <div className={cn(
                'w-6 h-6 flex items-center justify-center rounded-sm',
                location
                  ? isWfh
                    ? 'text-indigo-400'
                    : 'text-amber-400'
                  : 'text-[var(--text-tertiary)]'
              )}>
                {isWfh ? (
                  <Home size={14} />
                ) : isOffice ? (
                  <Building2 size={14} />
                ) : (
                  <span className="text-[10px]">-</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Today's status */}
      <div className={cn(
        'flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]',
      )}>
        {todayInfo ? (
          <>
            <span className="text-base">{todayInfo.emoji}</span>
            <span className="text-[11px] text-[var(--text-secondary)]">
              Today: {todayInfo.label}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Tap a day to set your work location
          </span>
        )}
      </div>
    </div>
  )
}
