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
