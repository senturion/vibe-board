'use client'

import { useState, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { useCalendarData } from '@/hooks/useCalendarData'
import { CalendarNav } from './CalendarNav'
import { CalendarGrid } from './CalendarGrid'
import { DayDetailPanel } from './DayDetailPanel'
import { LoadingState } from '@/components/ui/EmptyState'

export function CalendarView() {
  const { loading, getMonthData, getDayData } = useCalendarData()

  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthData = useMemo(
    () => getMonthData(currentYear, currentMonth),
    [getMonthData, currentYear, currentMonth]
  )

  const selectedDayData = useMemo(
    () => selectedDate ? getDayData(selectedDate) : null,
    [getDayData, selectedDate]
  )

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  const handleToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(null)
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date === selectedDate ? null : date)
  }

  if (loading) {
    return <LoadingState message="Loading calendar..." />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-[var(--accent)]" />
          <h1 className="text-lg font-medium text-[var(--text-primary)]">Calendar</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="mb-6">
            <CalendarNav
              year={currentYear}
              month={currentMonth}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
            />
          </div>

          {/* Calendar Grid */}
          <CalendarGrid
            year={currentYear}
            month={currentMonth}
            monthData={monthData}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

          {/* Summary Stats */}
          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <p className="text-2xl font-medium text-green-500">
                  {monthData.reduce((sum, d) => sum + d.habits.completed, 0)}
                </p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Habits Completed
                </p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <p className="text-2xl font-medium text-blue-500">
                  {monthData.filter(d => d.hasJournal).length}
                </p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Journal Entries
                </p>
              </div>
              <div className="text-center p-4 bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <p className="text-2xl font-medium text-orange-500">
                  {monthData.reduce((sum, d) => sum + d.routines.completed, 0)}
                </p>
                <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-1">
                  Routine Items Done
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDate && selectedDayData && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedDate(null)}
          />
          <DayDetailPanel
            date={selectedDate}
            data={selectedDayData}
            onClose={() => setSelectedDate(null)}
          />
        </>
      )}
    </div>
  )
}
