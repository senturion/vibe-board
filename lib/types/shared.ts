// =====================================================
// NAVIGATION
// =====================================================

export type ViewId = 'dashboard' | 'board' | 'habits' | 'goals' | 'journal' | 'routines' | 'focus' | 'activity'

export const VIEWS: { id: ViewId; title: string; icon: string }[] = [
  { id: 'dashboard', title: 'Home', icon: 'LayoutDashboard' },
  { id: 'habits', title: 'Habits', icon: 'Target' },
  { id: 'goals', title: 'Goals', icon: 'Flag' },
  { id: 'routines', title: 'Routines', icon: 'ListChecks' },
  { id: 'journal', title: 'Journal', icon: 'BookOpen' },
  { id: 'focus', title: 'Focus', icon: 'Timer' },
  { id: 'activity', title: 'Activity', icon: 'Activity' },
]

export type SectionViewMode = 'list' | 'day' | 'week' | 'month'
export type TemporalViewMode = 'day' | 'week' | 'month'
export type TemporalSectionId = 'habits' | 'goals' | 'routines' | 'board'

// =====================================================
// WORK LOCATION
// =====================================================

export type WorkLocation = 'wfh' | 'office'

export interface WorkLocationEntry {
  id: string
  date: string // YYYY-MM-DD
  location: WorkLocation
  createdAt: number
}

export const WORK_LOCATIONS: { id: WorkLocation; label: string; emoji: string }[] = [
  { id: 'wfh', label: 'Work from Home', emoji: '🏠' },
  { id: 'office', label: 'Office', emoji: '🏢' },
]

// =====================================================
// CALENDAR
// =====================================================

export interface CalendarDay {
  date: string // YYYY-MM-DD
  habits: { total: number; completed: number }
  hasJournal: boolean
  journalMood?: number
  routines: { total: number; completed: number }
}

// =====================================================
// DAY OF WEEK
// =====================================================

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 // 1=Mon, 7=Sun

export const DAYS_OF_WEEK: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 1, label: 'Monday', short: 'Mon' },
  { id: 2, label: 'Tuesday', short: 'Tue' },
  { id: 3, label: 'Wednesday', short: 'Wed' },
  { id: 4, label: 'Thursday', short: 'Thu' },
  { id: 5, label: 'Friday', short: 'Fri' },
  { id: 6, label: 'Saturday', short: 'Sat' },
  { id: 7, label: 'Sunday', short: 'Sun' },
]

export const DAY_PRESETS = {
  everyday: [1, 2, 3, 4, 5, 6, 7] as DayOfWeek[],
  weekdays: [1, 2, 3, 4, 5] as DayOfWeek[],
  weekends: [6, 7] as DayOfWeek[],
}

// =====================================================
// DATE HELPERS
// =====================================================

export function getCurrentDayOfWeek(): DayOfWeek {
  const day = new Date().getDay()
  return (day === 0 ? 7 : day) as DayOfWeek
}

export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateKey: string): Date {
  return new Date(dateKey + 'T00:00:00')
}

export function getWeekStart(date: Date = new Date(), weekStartsOn: 'monday' | 'sunday' = 'sunday'): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  const offset = weekStartsOn === 'monday'
    ? (day === 0 ? 6 : day - 1)
    : day
  start.setDate(start.getDate() - offset)
  return start
}

export function getWeekKey(date: Date = new Date(), weekStartsOn: 'monday' | 'sunday' = 'sunday'): string {
  return formatDateKey(getWeekStart(date, weekStartsOn))
}

export function getWeekDateKeys(date: Date = new Date(), weekStartsOn: 'monday' | 'sunday' = 'sunday'): string[] {
  const start = getWeekStart(date, weekStartsOn)
  const keys: string[] = []
  for (let i = 0; i < 7; i++) {
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() + i)
    keys.push(formatDateKey(cursor))
  }
  return keys
}

export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay))
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}
