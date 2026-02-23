export type ColumnId = string
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type LabelId = 'bug' | 'feature' | 'design' | 'docs' | 'refactor' | 'research'

export interface KanbanColumn {
  id: ColumnId
  title: string
}

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
  staleDaysThreshold?: number
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
  { key: '1-9', description: 'Move to column' },
  { key: 'Escape', description: 'Close modal' },
  { key: '?', description: 'Show shortcuts' },
]

export const COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'complete', title: 'Complete' },
]

const COLUMN_ID_MAX_LENGTH = 36
const COLUMN_TITLE_MAX_LENGTH = 40

export function normalizeColumnTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, COLUMN_TITLE_MAX_LENGTH)
}

export function normalizeColumnId(value: string): ColumnId {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, COLUMN_ID_MAX_LENGTH)
}

export function createColumnId(title: string, existingIds: Iterable<string>): ColumnId {
  const existing = new Set(existingIds)
  const base = normalizeColumnId(title) || 'column'
  let candidate = base
  let suffix = 2

  while (existing.has(candidate)) {
    const suffixText = `-${suffix}`
    const trimmedBase = base.slice(0, Math.max(1, COLUMN_ID_MAX_LENGTH - suffixText.length))
    candidate = `${trimmedBase}${suffixText}`
    suffix += 1
  }

  return candidate
}

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
