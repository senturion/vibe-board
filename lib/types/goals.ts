export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned'
export type GoalPriority = 'low' | 'medium' | 'high'
export type GoalTaskSuggestionTemplate = 'scope' | 'first_action' | 'review'

import type { ColumnId, Priority } from './kanban'

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

export interface GoalTaskPlanOptions {
  boardId: string
  column: ColumnId
  horizonDays: number
  maxTasks: number
}

export interface GoalTaskSuggestion {
  id: string
  goalId: string
  milestoneId?: string
  milestoneTitle?: string
  title: string
  description?: string
  dueDate?: string // YYYY-MM-DD
  priority: Priority
  column: ColumnId
  accepted: boolean
  template: GoalTaskSuggestionTemplate
  planHash: string
}

export const GOAL_STATUSES: { id: GoalStatus; label: string; color: string }[] = [
  { id: 'active', label: 'Active', color: 'var(--accent)' },
  { id: 'completed', label: 'Completed', color: 'var(--success)' },
  { id: 'paused', label: 'Paused', color: 'var(--text-tertiary)' },
  { id: 'abandoned', label: 'Abandoned', color: '#ef4444' },
]
