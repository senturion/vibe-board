'use client'

import { useCallback, useEffect, useState } from 'react'
import { KanbanTask, ColumnId, isOverdue, isDueSoon } from '@/lib/types'
import { FilterState, SortState } from '@/components/FilterSort'

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 } as const

interface UseFilteredTasksOptions {
  tasks: KanbanTask[]
  getTasksByColumn: (column: ColumnId) => KanbanTask[]
  getTaskTagIdsByTaskIds: (taskIds: string[]) => Promise<Record<string, string[]>>
  taskTagsVersion?: number
  filters?: FilterState
  sort?: SortState
}

function applyFilters(tasks: KanbanTask[], filters: FilterState, taskTagMap: Record<string, string[]>): KanbanTask[] {
  let result = tasks

  // Label filter
  if (filters.tags.length > 0 || filters.noTag) {
    result = result.filter(task => {
      const taskTags = taskTagMap[task.id] || []
      const matchesSelected = filters.tags.length > 0
        ? filters.tags.some(tagId => taskTags.includes(tagId))
        : false
      const matchesNoTag = filters.noTag && taskTags.length === 0
      return matchesSelected || matchesNoTag
    })
  }

  // Priority filter
  if (filters.priorities.length > 0) {
    result = result.filter(task =>
      filters.priorities.includes(task.priority)
    )
  }

  // Due date filter
  if (filters.dueDate !== 'all') {
    result = result.filter(task => {
      if (filters.dueDate === 'overdue') {
        return task.dueDate && isOverdue(task.dueDate)
      } else if (filters.dueDate === 'due-soon') {
        return task.dueDate && isDueSoon(task.dueDate) && !isOverdue(task.dueDate)
      } else if (filters.dueDate === 'no-date') {
        return !task.dueDate
      }
      return true
    })
  }

  return result
}

function applySorting(tasks: KanbanTask[], sort: SortState): KanbanTask[] {
  return [...tasks].sort((a, b) => {
    let comparison = 0
    switch (sort.by) {
      case 'created':
        comparison = a.createdAt - b.createdAt
        break
      case 'due':
        if (!a.dueDate && !b.dueDate) comparison = 0
        else if (!a.dueDate) comparison = 1
        else if (!b.dueDate) comparison = -1
        else comparison = a.dueDate - b.dueDate
        break
      case 'priority':
        comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        break
      case 'alpha':
        comparison = a.title.localeCompare(b.title)
        break
      default:
        comparison = a.order - b.order
    }
    return sort.direction === 'asc' ? comparison : -comparison
  })
}

export function useFilteredTasks({
  tasks,
  getTasksByColumn,
  getTaskTagIdsByTaskIds,
  taskTagsVersion,
  filters,
  sort,
}: UseFilteredTasksOptions) {
  const [taskTagMap, setTaskTagMap] = useState<Record<string, string[]>>({})

  // Load task tags when tasks change
  useEffect(() => {
    let isActive = true

    const loadTaskTags = async () => {
      if (tasks.length === 0) {
        if (isActive) setTaskTagMap({})
        return
      }

      const map = await getTaskTagIdsByTaskIds(tasks.map(task => task.id))
      if (isActive) setTaskTagMap(map)
    }

    loadTaskTags()

    return () => {
      isActive = false
    }
  }, [tasks, getTaskTagIdsByTaskIds, taskTagsVersion])

  const getFilteredTasksByColumn = useCallback((column: ColumnId) => {
    let columnTasks = getTasksByColumn(column)
    if (filters) {
      columnTasks = applyFilters(columnTasks, filters, taskTagMap)
    }
    if (sort) {
      columnTasks = applySorting(columnTasks, sort)
    }
    return columnTasks
  }, [filters, getTasksByColumn, sort, taskTagMap])

  return {
    taskTagMap,
    getFilteredTasksByColumn,
  }
}
