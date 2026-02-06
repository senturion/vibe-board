import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilteredTasks } from '../useFilteredTasks'
import { KanbanTask, ColumnId } from '@/lib/types'

// Fix time for date-dependent tests
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function makeTask(overrides: Partial<KanbanTask> = {}): KanbanTask {
  return {
    id: crypto.randomUUID(),
    title: 'Test Task',
    column: 'todo' as ColumnId,
    priority: 'medium',
    labels: [],
    subtasks: [],
    order: 0,
    createdAt: Date.now(),
    ...overrides,
  }
}

const noopGetTaskTagIds = vi.fn(async () => ({}))

describe('useFilteredTasks - filtering', () => {
  it('filters by priority', () => {
    const tasks = [
      makeTask({ id: '1', priority: 'high', column: 'todo' }),
      makeTask({ id: '2', priority: 'low', column: 'todo' }),
      makeTask({ id: '3', priority: 'high', column: 'todo' }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        filters: {
          tags: [],
          noTag: false,
          priorities: ['high'],
          dueDate: 'all',
        },
      })
    )

    const filtered = result.current.getFilteredTasksByColumn('todo')
    expect(filtered).toHaveLength(2)
    expect(filtered.every(t => t.priority === 'high')).toBe(true)
  })

  it('filters overdue tasks', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo', dueDate: new Date(2025, 5, 10).getTime() }), // overdue
      makeTask({ id: '2', column: 'todo', dueDate: new Date(2025, 5, 20).getTime() }), // future
      makeTask({ id: '3', column: 'todo' }), // no due date
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        filters: {
          tags: [],
          noTag: false,
          priorities: [],
          dueDate: 'overdue',
        },
      })
    )

    const filtered = result.current.getFilteredTasksByColumn('todo')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
  })

  it('filters tasks with no due date', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo', dueDate: new Date(2025, 5, 20).getTime() }),
      makeTask({ id: '2', column: 'todo' }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        filters: {
          tags: [],
          noTag: false,
          priorities: [],
          dueDate: 'no-date',
        },
      })
    )

    const filtered = result.current.getFilteredTasksByColumn('todo')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('2')
  })

  it('returns all tasks when no filters applied', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo' }),
      makeTask({ id: '2', column: 'todo' }),
      makeTask({ id: '3', column: 'in-progress' }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
      })
    )

    expect(result.current.getFilteredTasksByColumn('todo')).toHaveLength(2)
    expect(result.current.getFilteredTasksByColumn('in-progress')).toHaveLength(1)
  })
})

describe('useFilteredTasks - sorting', () => {
  it('sorts by priority ascending (urgent first)', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo', priority: 'low' }),
      makeTask({ id: '2', column: 'todo', priority: 'urgent' }),
      makeTask({ id: '3', column: 'todo', priority: 'high' }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        sort: { by: 'priority', direction: 'asc' },
      })
    )

    const sorted = result.current.getFilteredTasksByColumn('todo')
    expect(sorted.map(t => t.priority)).toEqual(['urgent', 'high', 'low'])
  })

  it('sorts by priority descending (low first)', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo', priority: 'low' }),
      makeTask({ id: '2', column: 'todo', priority: 'urgent' }),
      makeTask({ id: '3', column: 'todo', priority: 'high' }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        sort: { by: 'priority', direction: 'desc' },
      })
    )

    const sorted = result.current.getFilteredTasksByColumn('todo')
    expect(sorted.map(t => t.priority)).toEqual(['low', 'high', 'urgent'])
  })

  it('sorts alphabetically', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo', title: 'Zebra' }),
      makeTask({ id: '2', column: 'todo', title: 'Apple' }),
      makeTask({ id: '3', column: 'todo', title: 'Mango' }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        sort: { by: 'alpha', direction: 'asc' },
      })
    )

    const sorted = result.current.getFilteredTasksByColumn('todo')
    expect(sorted.map(t => t.title)).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('sorts by due date with missing dates at end', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo' }), // no due date
      makeTask({ id: '2', column: 'todo', dueDate: new Date(2025, 5, 20).getTime() }),
      makeTask({ id: '3', column: 'todo', dueDate: new Date(2025, 5, 10).getTime() }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        sort: { by: 'due', direction: 'asc' },
      })
    )

    const sorted = result.current.getFilteredTasksByColumn('todo')
    expect(sorted.map(t => t.id)).toEqual(['3', '2', '1'])
  })

  it('sorts by creation date', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo', createdAt: 3000 }),
      makeTask({ id: '2', column: 'todo', createdAt: 1000 }),
      makeTask({ id: '3', column: 'todo', createdAt: 2000 }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        sort: { by: 'created', direction: 'asc' },
      })
    )

    const sorted = result.current.getFilteredTasksByColumn('todo')
    expect(sorted.map(t => t.id)).toEqual(['2', '3', '1'])
  })
})

describe('useFilteredTasks - combined filter + sort', () => {
  it('filters by priority then sorts alphabetically', () => {
    const tasks = [
      makeTask({ id: '1', column: 'todo', priority: 'high', title: 'Zebra' }),
      makeTask({ id: '2', column: 'todo', priority: 'low', title: 'Apple' }),
      makeTask({ id: '3', column: 'todo', priority: 'high', title: 'Banana' }),
    ]

    const getTasksByColumn = (col: ColumnId) => tasks.filter(t => t.column === col)

    const { result } = renderHook(() =>
      useFilteredTasks({
        tasks,
        getTasksByColumn,
        getTaskTagIdsByTaskIds: noopGetTaskTagIds,
        filters: {
          tags: [],
          noTag: false,
          priorities: ['high'],
          dueDate: 'all',
        },
        sort: { by: 'alpha', direction: 'asc' },
      })
    )

    const filtered = result.current.getFilteredTasksByColumn('todo')
    expect(filtered).toHaveLength(2)
    expect(filtered.map(t => t.title)).toEqual(['Banana', 'Zebra'])
  })
})
