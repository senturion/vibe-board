import { DayOfWeek, WorkLocation, getCurrentDayOfWeek } from './shared'

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

export function isRoutineActiveToday(routine: Routine): boolean {
  return routine.isActive && routine.daysOfWeek.includes(getCurrentDayOfWeek())
}
