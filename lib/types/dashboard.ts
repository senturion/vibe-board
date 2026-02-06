import { ViewId, TemporalSectionId, SectionViewMode, formatDateKey } from './shared'

export type WidgetType = 'routines' | 'habits' | 'goals' | 'journal' | 'focus' | 'stats' | 'calendar' | 'weather' | 'tasks' | 'deadlines' | 'streaks' | 'activity'

export interface DashboardWidget {
  id: string
  widgetType: WidgetType
  title?: string
  positionX: number
  positionY: number
  width: number
  height: number
  config: Record<string, unknown>
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

export interface UserUIState {
  activeView: ViewId
  widgetStates: Record<string, { collapsed: boolean }>
  sectionViewModes: Record<TemporalSectionId, SectionViewMode>
  sectionSelectedDates: Record<TemporalSectionId, string>
  sidebarCollapsed: boolean
  focusedTaskId: string | null
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
  focusedTaskId: null,
}
