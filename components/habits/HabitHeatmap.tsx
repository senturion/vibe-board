'use client'

import { useMemo } from 'react'
import { HeatmapEntry, DAYS_OF_WEEK } from '@/lib/types'
import { cn } from '@/lib/utils'

interface HabitHeatmapProps {
  data: HeatmapEntry[]
  className?: string
  showMonthLabels?: boolean
  showDayLabels?: boolean
  cellSize?: 'sm' | 'md' | 'lg'
}

export function HabitHeatmap({
  data,
  className,
  showMonthLabels = true,
  showDayLabels = true,
  cellSize = 'md',
}: HabitHeatmapProps) {
  const cellSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  const levelColors = [
    'var(--heatmap-0)',
    'var(--heatmap-1)',
    'var(--heatmap-2)',
    'var(--heatmap-3)',
    'var(--heatmap-4)',
  ]

  // Organize data into weeks
  const weeks = useMemo(() => {
    const result: HeatmapEntry[][] = []
    let currentWeek: HeatmapEntry[] = []

    // Find the first day and pad to start on Sunday
    if (data.length > 0) {
      const firstDate = new Date(data[0].date)
      const firstDayOfWeek = firstDate.getDay()

      // Add empty cells for days before the first entry
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: '', count: 0, level: 0 })
      }
    }

    data.forEach((entry, index) => {
      currentWeek.push(entry)

      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    })

    // Add remaining days
    if (currentWeek.length > 0) {
      result.push(currentWeek)
    }

    return result
  }, [data])

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; position: number }[] = []
    let currentMonth = ''

    weeks.forEach((week, weekIndex) => {
      const firstValidDay = week.find(d => d.date)
      if (firstValidDay) {
        const date = new Date(firstValidDay.date)
        const month = date.toLocaleDateString('en-US', { month: 'short' })
        if (month !== currentMonth) {
          labels.push({ month, position: weekIndex })
          currentMonth = month
        }
      }
    })

    return labels
  }, [weeks])

  const dayLabels = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat']

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Month labels */}
      {showMonthLabels && (
        <div className="flex ml-8 mb-1">
          {monthLabels.map((label, i) => (
            <div
              key={i}
              className="text-[10px] text-[var(--text-tertiary)]"
              style={{
                marginLeft: i === 0 ? `${label.position * 14}px` : undefined,
                width: i < monthLabels.length - 1
                  ? `${(monthLabels[i + 1].position - label.position) * 14}px`
                  : 'auto',
              }}
            >
              {label.month}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1">
        {/* Day labels */}
        {showDayLabels && (
          <div className="flex flex-col gap-[2px] mr-1">
            {dayLabels.map((day, i) => (
              <div
                key={i}
                className={cn('text-[9px] text-[var(--text-tertiary)] flex items-center', cellSizes[cellSize])}
              >
                {day}
              </div>
            ))}
          </div>
        )}

        {/* Heatmap grid */}
        <div className="flex gap-[2px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px]">
              {week.map((entry, dayIndex) => (
                <div
                  key={dayIndex}
                  className={cn(
                    'transition-colors',
                    cellSizes[cellSize],
                    entry.date && 'animate-heatmap-cell hover:ring-1 hover:ring-[var(--text-tertiary)]'
                  )}
                  style={{
                    backgroundColor: entry.date ? levelColors[entry.level] : 'transparent',
                    animationDelay: `${(weekIndex * 7 + dayIndex) * 2}ms`,
                  }}
                  title={entry.date ? `${entry.date}: ${entry.count} completion${entry.count !== 1 ? 's' : ''}` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 ml-8">
        <span className="text-[10px] text-[var(--text-tertiary)]">Less</span>
        <div className="flex gap-[2px]">
          {levelColors.map((color, i) => (
            <div
              key={i}
              className={cellSizes[cellSize]}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)]">More</span>
      </div>
    </div>
  )
}

interface MiniHeatmapProps {
  data: HeatmapEntry[]
  days?: number
  className?: string
}

export function MiniHeatmap({ data, days = 30, className }: MiniHeatmapProps) {
  const recentData = data.slice(-days)

  const levelColors = [
    'var(--heatmap-0)',
    'var(--heatmap-1)',
    'var(--heatmap-2)',
    'var(--heatmap-3)',
    'var(--heatmap-4)',
  ]

  return (
    <div className={cn('flex gap-[2px]', className)}>
      {recentData.map((entry, i) => (
        <div
          key={i}
          className="w-2 h-2 animate-heatmap-cell"
          style={{
            backgroundColor: levelColors[entry.level],
            animationDelay: `${i * 10}ms`,
          }}
          title={`${entry.date}: ${entry.count}`}
        />
      ))}
    </div>
  )
}
