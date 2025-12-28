export type ColumnId = 'todo' | 'in-progress' | 'complete'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

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
  subtasks: Subtask[]
  order: number
  createdAt: number
  archivedAt?: number
}

export const PRIORITIES: { id: Priority; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: 'var(--text-tertiary)' },
  { id: 'medium', label: 'Medium', color: 'var(--text-secondary)' },
  { id: 'high', label: 'High', color: 'var(--accent)' },
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
]

export const KEYBOARD_SHORTCUTS = [
  { key: 'n', description: 'New task' },
  { key: '⌘ k', description: 'Quick capture' },
  { key: '1 / 2 / 3', description: 'Move to column' },
  { key: 'Escape', description: 'Close modal' },
  { key: '?', description: 'Show shortcuts' },
]

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
  { id: 'todo', title: 'Todo' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'complete', title: 'Complete' },
]
