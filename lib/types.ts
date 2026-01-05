export type ColumnId = 'backlog' | 'todo' | 'in-progress' | 'complete'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type LabelId = 'bug' | 'feature' | 'design' | 'docs' | 'refactor' | 'research'

export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface KanbanTask {
  id: string
  title: string
  description?: string
  column: ColumnId
  priority: Priority
  labels: LabelId[]
  subtasks: Subtask[]
  dueDate?: number
  order: number
  createdAt: number
  updatedAt?: number
  completedAt?: number  // When task was moved to complete
  archivedAt?: number
  boardId?: string  // For multi-board support
}

export interface Board {
  id: string
  name: string
  createdAt: number
}

export const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'var(--text-tertiary)' },
  { id: 'medium', label: 'Medium', color: 'var(--text-secondary)' },
  { id: 'high', label: 'High', color: 'var(--accent)' },
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
]

export const LABELS: { id: LabelId; label: string; color: string; bg: string }[] = [
  { id: 'bug', label: 'Bug', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  { id: 'feature', label: 'Feature', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  { id: 'design', label: 'Design', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  { id: 'docs', label: 'Docs', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
  { id: 'refactor', label: 'Refactor', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { id: 'research', label: 'Research', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)' },
]

export const KEYBOARD_SHORTCUTS = [
  { key: 'n', description: 'New task' },
  { key: '⌘ k', description: 'Quick capture' },
  { key: '/', description: 'Search' },
  { key: '1 / 2 / 3 / 4', description: 'Move to column' },
  { key: 'Escape', description: 'Close modal' },
  { key: '?', description: 'Show shortcuts' },
]

// =====================================================
// CUSTOMIZABLE TAGS
// =====================================================

export interface TagCategory {
  id: string
  name: string
  order: number
  createdAt: number
}

export interface Tag {
  id: string
  categoryId?: string
  name: string
  color: string
  bgColor: string
  order: number
  createdAt: number
  category?: TagCategory
}

// Default tag colors for picker
export const TAG_COLORS: { color: string; bg: string }[] = [
  { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' }, // red
  { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)' },  // orange
  { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },  // amber
  { color: '#a3e635', bg: 'rgba(163, 230, 53, 0.15)' },  // lime
  { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },  // green
  { color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)' },  // teal
  { color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)' },  // cyan
  { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },  // blue
  { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' }, // violet
  { color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' }, // purple
  { color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' }, // pink
  { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }, // slate
]

// Default tag categories
export const DEFAULT_TAG_CATEGORIES: string[] = ['Type', 'Priority', 'Status']

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

export interface Note {
  content: string
  updatedAt: number
}

export const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'complete', title: 'Complete' },
]

// Helper to check if a date is overdue
export function isOverdue(dueDate: number): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return dueDate < now.getTime()
}

// Helper to check if due soon (within 2 days)
export function isDueSoon(dueDate: number): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const twoDaysFromNow = now.getTime() + 2 * 24 * 60 * 60 * 1000
  return dueDate >= now.getTime() && dueDate <= twoDaysFromNow
}

// =====================================================
// LIFE DASHBOARD TYPES
// =====================================================

// Navigation
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

// Section view modes (list vs temporal views)
export type SectionViewMode = 'list' | 'day' | 'week' | 'month'
export type TemporalViewMode = 'day' | 'week' | 'month'

// Sections that support temporal views
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
// ROUTINES
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

export interface Routine {
  id: string
  name: string
  description?: string
  daysOfWeek: DayOfWeek[]
  location?: WorkLocation // undefined = both locations
  isActive: boolean
  order: number
  createdAt: number
  items?: RoutineItem[]
}

export interface RoutineItem {
  id: string
  routineId: string
  title: string
  targetTime?: number // in minutes
  order: number
  createdAt: number
}

export interface RoutineCompletion {
  id: string
  routineId: string
  completionDate: string // YYYY-MM-DD
  completedAt: number
}

export interface RoutineItemCompletion {
  id: string
  routineItemId: string
  completionDate: string // YYYY-MM-DD
  completedAt: number
  duration?: number // in minutes
}

// =====================================================
// HABITS
// =====================================================

export type FrequencyType = 'daily' | 'weekly' | 'specific_days'

export interface HabitCategory {
  id: string
  name: string
  color: string
  icon?: string
  order: number
  createdAt: number
}

export interface Habit {
  id: string
  categoryId?: string
  name: string
  description?: string
  frequencyType: FrequencyType
  frequencyValue: number // for 'weekly': X times per week
  specificDays?: DayOfWeek[] // for 'specific_days'
  targetCount: number // how many times per day/occasion
  isActive: boolean
  color: string
  icon?: string
  order: number
  createdAt: number
  archivedAt?: number
  category?: HabitCategory
}

export interface HabitCompletion {
  id: string
  habitId: string
  completionDate: string // YYYY-MM-DD
  count: number // supports multiple completions per day
  note?: string
  completedAt: number
}

export interface HabitStreak {
  id: string
  habitId: string
  currentStreak: number
  bestStreak: number
  lastCompletionDate?: string // YYYY-MM-DD
  updatedAt: number
}

// Habit Analytics
export interface HeatmapEntry {
  date: string // YYYY-MM-DD
  count: number
  level: 0 | 1 | 2 | 3 | 4 // 0=none, 1-4=intensity levels
}

export interface HabitStats {
  totalCompletions: number
  averagePerWeek: number
  currentStreak: number
  bestStreak: number
  completionRate: number // percentage
}

export const HABIT_COLORS: string[] = [
  '#e07a5f', // terracotta
  '#81b29a', // sage
  '#f2cc8f', // sand
  '#3d405b', // charcoal
  '#f4a261', // orange
  '#2a9d8f', // teal
  '#e76f51', // coral
  '#264653', // dark teal
]

// =====================================================
// GOALS
// =====================================================

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned'
export type GoalPriority = 'low' | 'medium' | 'high'

export interface GoalCategory {
  id: string
  name: string
  color: string
  icon?: string
  order: number
  createdAt: number
}

export interface Goal {
  id: string
  categoryId?: string
  title: string
  description?: string
  targetDate?: string // YYYY-MM-DD
  startDate: string // YYYY-MM-DD
  status: GoalStatus
  progress: number // 0-100
  priority: GoalPriority
  order: number
  createdAt: number
  completedAt?: number
  archivedAt?: number
  category?: GoalCategory
  milestones?: Milestone[]
}

export interface Milestone {
  id: string
  goalId: string
  title: string
  description?: string
  targetDate?: string // YYYY-MM-DD
  isCompleted: boolean
  completedAt?: number
  order: number
  createdAt: number
}

export interface GoalTaskLink {
  id: string
  goalId: string
  taskId: string
  createdAt: number
}

export const GOAL_STATUSES: { id: GoalStatus; label: string; color: string }[] = [
  { id: 'active', label: 'Active', color: 'var(--accent)' },
  { id: 'completed', label: 'Completed', color: 'var(--success)' },
  { id: 'paused', label: 'Paused', color: 'var(--text-tertiary)' },
  { id: 'abandoned', label: 'Abandoned', color: '#ef4444' },
]

// =====================================================
// JOURNAL
// =====================================================

export interface JournalPrompt {
  id: string
  promptText: string
  isActive: boolean
  order: number
  createdAt: number
}

export interface JournalEntry {
  id: string
  entryDate: string // YYYY-MM-DD
  content: string
  mood?: number // 1-10 scale
  moodEmoji?: string
  tags: string[]
  isFavorite: boolean
  wordCount: number
  createdAt: number
  updatedAt: number
}

export const DEFAULT_JOURNAL_PROMPTS: string[] = [
  'What are you grateful for today?',
  'What was the highlight of your day?',
  'What challenged you today?',
  'What did you learn today?',
  'How are you feeling right now?',
  'What are your intentions for tomorrow?',
]

// =====================================================
// FOCUS TIMER
// =====================================================

export type SessionType = 'work' | 'short_break' | 'long_break'

export interface FocusSettings {
  workDuration: number // minutes
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  soundEnabled: boolean
  soundVolume: number // 0-100
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
  soundVolume: 70,
}

export interface FocusSession {
  id: string
  sessionType: SessionType
  plannedDuration: number // minutes
  actualDuration?: number // minutes
  isCompleted: boolean
  taskId?: string
  goalId?: string
  note?: string
  startedAt: number
  endedAt?: number
}

export const SESSION_TYPES: { id: SessionType; label: string; color: string }[] = [
  { id: 'work', label: 'Work', color: 'var(--accent)' },
  { id: 'short_break', label: 'Short Break', color: 'var(--success)' },
  { id: 'long_break', label: 'Long Break', color: '#81b29a' },
]

// =====================================================
// DASHBOARD WIDGETS
// =====================================================

export type WidgetType = 'routines' | 'habits' | 'goals' | 'journal' | 'focus' | 'stats' | 'calendar' | 'weather' | 'tasks' | 'deadlines' | 'streaks' | 'activity'

export interface DashboardWidget {
  id: string
  widgetType: WidgetType
  title?: string // custom title override
  positionX: number
  positionY: number
  width: number // grid columns
  height: number // grid rows
  config: Record<string, unknown> // widget-specific settings
  isVisible: boolean
  createdAt: number
}

export const WIDGET_TYPES: { id: WidgetType; title: string; icon: string; defaultSize: { width: number; height: number }; description: string }[] = [
  { id: 'routines', title: 'Today\'s Routines', icon: 'ListChecks', defaultSize: { width: 1, height: 2 }, description: 'Track daily routines' },
  { id: 'habits', title: 'Habit Tracker', icon: 'Target', defaultSize: { width: 2, height: 2 }, description: 'Check off daily habits' },
  { id: 'goals', title: 'Goals Progress', icon: 'Flag', defaultSize: { width: 1, height: 2 }, description: 'View goal progress' },
  { id: 'journal', title: 'Quick Journal', icon: 'BookOpen', defaultSize: { width: 1, height: 1 }, description: 'Quick journal entry' },
  { id: 'focus', title: 'Focus Timer', icon: 'Timer', defaultSize: { width: 1, height: 1 }, description: 'Pomodoro timer' },
  { id: 'stats', title: 'Quick Stats', icon: 'BarChart3', defaultSize: { width: 2, height: 1 }, description: 'Overview statistics' },
  { id: 'calendar', title: 'Calendar', icon: 'Calendar', defaultSize: { width: 1, height: 2 }, description: 'Monthly calendar view' },
  { id: 'weather', title: 'Weather', icon: 'Cloud', defaultSize: { width: 1, height: 1 }, description: 'Current weather' },
  { id: 'tasks', title: 'Today\'s Tasks', icon: 'CheckSquare', defaultSize: { width: 1, height: 2 }, description: 'Tasks due today' },
  { id: 'deadlines', title: 'Upcoming Deadlines', icon: 'Clock', defaultSize: { width: 1, height: 2 }, description: 'Tasks and goals due soon' },
  { id: 'streaks', title: 'Habit Streaks', icon: 'Flame', defaultSize: { width: 1, height: 1 }, description: 'Current habit streaks' },
  { id: 'activity', title: 'Activity Feed', icon: 'Activity', defaultSize: { width: 1, height: 2 }, description: 'Recent activity log' },
]

// =====================================================
// USER UI STATE (Cloud persistence)
// =====================================================

export interface UserUIState {
  activeView: ViewId
  widgetStates: Record<string, { collapsed: boolean }>
  sectionViewModes: Record<TemporalSectionId, SectionViewMode>
  sectionSelectedDates: Record<TemporalSectionId, string> // YYYY-MM-DD
  sidebarCollapsed: boolean
}

export const DEFAULT_UI_STATE: UserUIState = {
  activeView: 'dashboard',
  widgetStates: {},
  sectionViewModes: {
    habits: 'list',
    goals: 'list',
    routines: 'list',
    board: 'list',
  },
  sectionSelectedDates: {
    habits: formatDateKey(),
    goals: formatDateKey(),
    routines: formatDateKey(),
    board: formatDateKey(),
  },
  sidebarCollapsed: false,
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get current day of week (1=Mon, 7=Sun)
export function getCurrentDayOfWeek(): DayOfWeek {
  const day = new Date().getDay()
  return (day === 0 ? 7 : day) as DayOfWeek
}

// Check if a routine should be active today
export function isRoutineActiveToday(routine: Routine): boolean {
  return routine.isActive && routine.daysOfWeek.includes(getCurrentDayOfWeek())
}

// Check if a habit should be tracked today
export function isHabitActiveToday(habit: Habit): boolean {
  if (!habit.isActive) return false
  const today = getCurrentDayOfWeek()

  switch (habit.frequencyType) {
    case 'daily':
      return true
    case 'specific_days':
      return habit.specificDays?.includes(today) ?? false
    case 'weekly':
      return true // weekly habits can be completed any day
    default:
      return false
  }
}

// Format date as YYYY-MM-DD
export function formatDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Parse YYYY-MM-DD to Date
export function parseDateKey(dateKey: string): Date {
  return new Date(dateKey + 'T00:00:00')
}

// Calculate days between two dates
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay))
}

// Calculate word count
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}
