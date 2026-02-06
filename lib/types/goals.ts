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
