import type { Goal, KanbanTask, Milestone } from '@/lib/types'
import { formatDateKey, parseDateKey } from '@/lib/types'

/** Tasks overdue by at most this many days still show on Today. */
export const OVERDUE_WINDOW_DAYS = 2

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function byDueThenPriority(a: KanbanTask, b: KanbanTask) {
  return (a.dueDate! - b.dueDate!) || ((PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2))
}

/**
 * The tasks Today shows: open tasks due today, and open tasks that became
 * overdue within the last OVERDUE_WINDOW_DAYS days. Older overdue tasks are
 * left to the board, so Today does not fill up with a backlog.
 */
export function selectTodayTasks(tasks: KanbanTask[], now: Date) {
  const today = startOfDay(now).getTime()
  const earliest = new Date(today)
  earliest.setDate(earliest.getDate() - OVERDUE_WINDOW_DAYS)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const open = tasks.filter(
    t => t.dueDate !== undefined && !t.archivedAt && t.column !== 'complete',
  )
  const overdue = open
    .filter(t => t.dueDate! >= earliest.getTime() && t.dueDate! < today)
    .sort(byDueThenPriority)
  const dueToday = open
    .filter(t => t.dueDate! >= today && t.dueDate! < tomorrow.getTime())
    .sort(byDueThenPriority)
  return { overdue, dueToday }
}

export interface UpcomingDeadline {
  id: string
  kind: 'goal' | 'milestone'
  title: string
  date: string // YYYY-MM-DD
}

/** Active goals and open milestones due from today through the next `days` days. */
export function upcomingDeadlines(
  goals: Goal[],
  milestones: Milestone[],
  now: Date,
  days = 14,
  limit = 5,
): UpcomingDeadline[] {
  const from = formatDateKey(now)
  const end = startOfDay(now)
  end.setDate(end.getDate() + days)
  const to = formatDateKey(end)
  const inRange = (date?: string) => !!date && date >= from && date <= to

  const activeGoalIds = new Set(goals.filter(g => g.status === 'active' && !g.archivedAt).map(g => g.id))
  const items: UpcomingDeadline[] = [
    ...goals
      .filter(g => activeGoalIds.has(g.id) && inRange(g.targetDate))
      .map(g => ({ id: g.id, kind: 'goal' as const, title: g.title, date: g.targetDate! })),
    ...milestones
      .filter(m => !m.isCompleted && activeGoalIds.has(m.goalId) && inRange(m.targetDate))
      .map(m => ({ id: m.id, kind: 'milestone' as const, title: m.title, date: m.targetDate! })),
  ]
  return items
    .sort((a, b) => parseDateKey(a.date).getTime() - parseDateKey(b.date).getTime())
    .slice(0, limit)
}
