import { Habit, HabitCompletion, DayOfWeek } from '@/lib/types'
import { SectionViewMode } from '@/lib/types'
import { cn } from '@/lib/utils'
import { HabitIcon } from './IconPicker'
import { TemporalNav, DayView, WeekView, MonthView } from '@/components/temporal'

interface CalendarViewProps {
  habits: Habit[]
  completions: HabitCompletion[]
  temporal: {
    mode: SectionViewMode
    setMode: (mode: SectionViewMode) => void
    currentDate: Date
    setCurrentDate: (date: Date) => void
    dateLabel: string
    goToPrev: () => void
    goToNext: () => void
    goToToday: () => void
    isToday: boolean
    dateRange: { start: Date; end: Date }
  }
}

const getCompletionDate = (completion: HabitCompletion) => completion.completionDate

export function CalendarView({ habits, completions, temporal }: CalendarViewProps) {
  return (
    <div className="h-full flex flex-col -m-6">
      <TemporalNav
        mode={temporal.mode}
        onModeChange={temporal.setMode}
        dateLabel={temporal.dateLabel}
        onPrev={temporal.goToPrev}
        onNext={temporal.goToNext}
        onToday={temporal.goToToday}
        isToday={temporal.isToday}
        showListMode={false}
      />

      {temporal.mode === 'day' && (
        <DayView
          date={temporal.currentDate}
          items={completions}
          getItemDate={getCompletionDate}
          emptyMessage="No habits completed on this day"
          renderItem={(completion) => {
            const habit = habits.find(h => h.id === completion.habitId)
            if (!habit) return null
            return (
              <div
                className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded"
                style={{ borderLeft: `3px solid ${habit.color}` }}
              >
                <div
                  className="w-6 h-6 flex items-center justify-center"
                  style={{ color: habit.color }}
                >
                  <HabitIcon name={habit.icon || 'target'} size={16} color={habit.color} />
                </div>
                <span className="text-sm text-[var(--text-primary)]">{habit.name}</span>
                {completion.count > 1 && (
                  <span className="text-xs text-[var(--text-tertiary)]">&times;{completion.count}</span>
                )}
              </div>
            )
          }}
        />
      )}

      {temporal.mode === 'week' && (
        <WeekView
          startDate={temporal.dateRange.start}
          items={completions}
          getItemDate={getCompletionDate}
          onDayClick={(date) => {
            temporal.setCurrentDate(date)
            temporal.setMode('day')
          }}
          renderItem={(completion) => {
            const habit = habits.find(h => h.id === completion.habitId)
            if (!habit) return null
            return (
              <div
                className="px-1.5 py-0.5 rounded text-[10px] truncate flex items-center gap-1"
                style={{ backgroundColor: habit.color + '20', color: habit.color }}
              >
                <HabitIcon name={habit.icon || 'target'} size={10} color={habit.color} />
                {habit.name}
              </div>
            )
          }}
        />
      )}

      {temporal.mode === 'month' && (
        <MonthView
          year={temporal.currentDate.getFullYear()}
          month={temporal.currentDate.getMonth()}
          items={completions}
          getItemDate={getCompletionDate}
          selectedDate={temporal.currentDate}
          onDayClick={(date) => {
            temporal.setCurrentDate(date)
            temporal.setMode('day')
          }}
          renderDayContent={(date, dayCompletions) => {
            const activeForDay = habits.filter(h => {
              if (!h.isActive) return false
              if (h.frequencyType === 'daily') return true
              if (h.frequencyType === 'specific_days') {
                const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
                return h.specificDays?.includes(dayOfWeek as DayOfWeek) ?? false
              }
              return true
            })

            if (activeForDay.length === 0) return null

            const completedHabitIds = new Set<string>()
            activeForDay.forEach(h => {
              if (h.habitType === 'avoid' && h.trackingMode === 'auto-complete') {
                const hasSlip = dayCompletions.some(c => c.habitId === h.id)
                if (!hasSlip) completedHabitIds.add(h.id)
              } else {
                const total = dayCompletions
                  .filter(c => c.habitId === h.id)
                  .reduce((sum, c) => sum + c.count, 0)
                if (total >= h.targetCount) completedHabitIds.add(h.id)
              }
            })

            const displayHabits = activeForDay.slice(0, 4)
            const overflow = activeForDay.length - 4
            const allComplete = activeForDay.every(h => completedHabitIds.has(h.id))
            const noneComplete = activeForDay.every(h => !completedHabitIds.has(h.id))
            const isPast = date < new Date(new Date().toDateString())

            return (
              <div className={cn(
                'space-y-0.5',
                allComplete && 'border-l-2 border-[var(--success)] -ml-1 pl-0.5',
                !allComplete && noneComplete && isPast && 'border-l-2 border-red-400/30 -ml-1 pl-0.5'
              )}>
                <div className="flex flex-wrap gap-0.5">
                  {displayHabits.map(h => (
                    <HabitIcon
                      key={h.id}
                      name={h.icon || 'target'}
                      size={12}
                      color={h.color}
                      className={cn(
                        'transition-opacity',
                        completedHabitIds.has(h.id) ? 'opacity-100' : 'opacity-30'
                      )}
                    />
                  ))}
                </div>
                {overflow > 0 && (
                  <div className="text-[8px] text-[var(--text-tertiary)]">
                    +{overflow}
                  </div>
                )}
              </div>
            )
          }}
        />
      )}
    </div>
  )
}
