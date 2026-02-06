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

export const TAG_COLORS: { color: string; bg: string }[] = [
  { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)' },
  { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { color: '#a3e635', bg: 'rgba(163, 230, 53, 0.15)' },
  { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
  { color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)' },
  { color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)' },
  { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  { color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  { color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' },
  { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
]

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
