import { describe, it, expect } from 'vitest'
import { selectTodayTasks, upcomingDeadlines } from '../today'
import type { Goal, KanbanTask, Milestone } from '../types'

const NOW = new Date(2026, 10, 17, 15, 30) // Tue Nov 17, mid-afternoon local time

const day = (offset: number) => new Date(2026, 10, 17 + offset).getTime()

function task(id: string, overrides: Partial<KanbanTask> = {}): KanbanTask {
  return {
    id,
    title: id,
    column: 'todo',
    priority: 'medium',
    labels: [],
    subtasks: [],
    order: 0,
    createdAt: day(-30),
    ...overrides,
  }
}

describe('selectTodayTasks', () => {
  it('includes tasks due today and up to two days overdue', () => {
    const { overdue, dueToday } = selectTodayTasks(
      [
        task('today', { dueDate: day(0) }),
        task('yesterday', { dueDate: day(-1) }),
        task('two-days', { dueDate: day(-2) }),
        task('three-days', { dueDate: day(-3) }),
        task('tomorrow', { dueDate: day(1) }),
        task('no-date'),
      ],
      NOW,
    )
    expect(dueToday.map(t => t.id)).toEqual(['today'])
    expect(overdue.map(t => t.id)).toEqual(['two-days', 'yesterday'])
  })

  it('leaves out finished and archived tasks', () => {
    const { overdue, dueToday } = selectTodayTasks(
      [
        task('done', { dueDate: day(0), column: 'complete' }),
        task('archived', { dueDate: day(-1), archivedAt: day(-1) }),
      ],
      NOW,
    )
    expect([...overdue, ...dueToday]).toHaveLength(0)
  })

  it('orders tasks due the same day by priority', () => {
    const { dueToday } = selectTodayTasks(
      [
        task('low', { dueDate: day(0), priority: 'low' }),
        task('urgent', { dueDate: day(0), priority: 'urgent' }),
        task('high', { dueDate: day(0), priority: 'high' }),
      ],
      NOW,
    )
    expect(dueToday.map(t => t.id)).toEqual(['urgent', 'high', 'low'])
  })
})

describe('upcomingDeadlines', () => {
  const goal = (id: string, targetDate: string, status: Goal['status'] = 'active'): Goal => ({
    id,
    title: id,
    targetDate,
    startDate: '2026-01-01',
    status,
    progress: 0,
    priority: 'medium',
    order: 0,
    createdAt: 0,
  })
  const milestone = (id: string, goalId: string, targetDate: string, isCompleted = false): Milestone => ({
    id,
    goalId,
    title: id,
    targetDate,
    isCompleted,
    order: 0,
    createdAt: 0,
  })

  it('lists active goals and open milestones due in the next two weeks, soonest first', () => {
    const result = upcomingDeadlines(
      [goal('novel', '2026-11-30'), goal('far', '2027-03-01'), goal('paused', '2026-11-20', 'paused')],
      [
        milestone('outline', 'novel', '2026-11-22'),
        milestone('done', 'novel', '2026-11-19', true),
        milestone('of-paused', 'paused', '2026-11-18'),
        milestone('past', 'novel', '2026-11-10'),
      ],
      NOW,
    )
    expect(result.map(d => d.id)).toEqual(['outline', 'novel'])
  })
})
