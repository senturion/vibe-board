'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core'
import { Archive } from 'lucide-react'
import { COLUMNS, ColumnId, KanbanTask, isOverdue, isDueSoon } from '@/lib/types'
import { useKanban } from '@/hooks/useKanban'
import { useUndoRedo } from '@/contexts/UndoRedoContext'
import { useColumnColors } from '@/hooks/useColumnColors'
import { Column } from './Column'
import { CardDetailModal } from './CardDetailModal'
import { ArchivePanel } from './ArchivePanel'
import { QuickCapture } from './QuickCapture'
import { KeyboardShortcuts } from './KeyboardShortcuts'
import { Search } from './Search'
import { FilterState, SortState } from '@/components/FilterSort'

interface BoardProps {
  boardId?: string
  searchOpen?: boolean
  onSearchClose?: () => void
  filters?: FilterState
  sort?: SortState
  compact?: boolean
}

export function Board({ boardId = 'default', searchOpen, onSearchClose, filters, sort, compact = false }: BoardProps) {
  const { getColumnColor, setColumnColor } = useColumnColors()
  const {
    tasks,
    addTask: rawAddTask,
    updateTask: rawUpdateTask,
    deleteTask: rawDeleteTask,
    archiveTask: rawArchiveTask,
    restoreTask: rawRestoreTask,
    moveTask: rawMoveTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    toggleLabel,
    searchTasks,
    getTasksByColumn,
    getArchivedTasks,
    getTaskById,
  } = useKanban(boardId)

  const { pushAction } = useUndoRedo()

  // Wrapped actions with undo/redo support
  const addTask = useCallback((title: string, column: ColumnId = 'todo', priority: KanbanTask['priority'] = 'medium') => {
    const taskId = rawAddTask(title, column, priority)
    pushAction({
      type: 'add',
      description: `Added "${title.slice(0, 30)}${title.length > 30 ? '...' : ''}"`,
      undo: () => rawDeleteTask(taskId),
      redo: () => rawAddTask(title, column, priority),
    })
    return taskId
  }, [rawAddTask, rawDeleteTask, pushAction])

  const deleteTask = useCallback((id: string) => {
    const task = getTaskById(id)
    if (!task) return
    rawDeleteTask(id)
    pushAction({
      type: 'delete',
      description: `Deleted "${task.title.slice(0, 30)}${task.title.length > 30 ? '...' : ''}"`,
      undo: () => {
        // Re-add the task with all its properties
        const newId = rawAddTask(task.title, task.column, task.priority)
        if (task.description) rawUpdateTask(newId, { description: task.description })
        if (task.labels?.length) rawUpdateTask(newId, { labels: task.labels })
        if (task.dueDate) rawUpdateTask(newId, { dueDate: task.dueDate })
        if (task.subtasks?.length) rawUpdateTask(newId, { subtasks: task.subtasks })
        rawUpdateTask(newId, { order: task.order, createdAt: task.createdAt })
      },
      redo: () => rawDeleteTask(id),
    })
  }, [rawDeleteTask, rawAddTask, rawUpdateTask, getTaskById, pushAction])

  const updateTask = useCallback((id: string, updates: Partial<KanbanTask>) => {
    const task = getTaskById(id)
    if (!task) return
    const previousState = { ...task }
    rawUpdateTask(id, updates)
    pushAction({
      type: 'update',
      description: `Updated "${task.title.slice(0, 25)}${task.title.length > 25 ? '...' : ''}"`,
      undo: () => rawUpdateTask(id, previousState),
      redo: () => rawUpdateTask(id, updates),
    })
  }, [rawUpdateTask, getTaskById, pushAction])

  const archiveTask = useCallback((id: string) => {
    const task = getTaskById(id)
    if (!task) return
    rawArchiveTask(id)
    pushAction({
      type: 'archive',
      description: `Archived "${task.title.slice(0, 25)}${task.title.length > 25 ? '...' : ''}"`,
      undo: () => rawRestoreTask(id),
      redo: () => rawArchiveTask(id),
    })
  }, [rawArchiveTask, rawRestoreTask, getTaskById, pushAction])

  const restoreTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    rawRestoreTask(id)
    pushAction({
      type: 'restore',
      description: `Restored "${task.title.slice(0, 25)}${task.title.length > 25 ? '...' : ''}"`,
      undo: () => rawArchiveTask(id),
      redo: () => rawRestoreTask(id),
    })
  }, [rawRestoreTask, rawArchiveTask, tasks, pushAction])

  const moveTask = useCallback((taskId: string, toColumn: ColumnId, newOrder?: number) => {
    const task = getTaskById(taskId)
    if (!task) return
    const previousColumn = task.column
    const previousOrder = task.order
    rawMoveTask(taskId, toColumn, newOrder)
    // Only track column changes (not reordering within column)
    if (previousColumn !== toColumn) {
      const fromCol = COLUMNS.find(c => c.id === previousColumn)?.title
      const toCol = COLUMNS.find(c => c.id === toColumn)?.title
      pushAction({
        type: 'move',
        description: `Moved to ${toCol}`,
        undo: () => rawMoveTask(taskId, previousColumn, previousOrder),
        redo: () => rawMoveTask(taskId, toColumn, newOrder),
      })
    }
  }, [rawMoveTask, getTaskById, pushAction])

  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [showQuickCapture, setShowQuickCapture] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [internalShowSearch, setInternalShowSearch] = useState(false)

  // Support both controlled and uncontrolled search modes
  const showSearch = searchOpen !== undefined ? searchOpen : internalShowSearch
  const setShowSearch = onSearchClose
    ? (show: boolean) => { if (!show) onSearchClose(); else setInternalShowSearch(true); }
    : setInternalShowSearch

  // Apply filters and sorting to tasks
  const getFilteredTasksByColumn = useCallback((column: ColumnId) => {
    let columnTasks = getTasksByColumn(column)

    // Apply filters
    if (filters) {
      // Label filter
      if (filters.labels.length > 0) {
        columnTasks = columnTasks.filter(task =>
          filters.labels.some(label => (task.labels || []).includes(label))
        )
      }

      // Priority filter
      if (filters.priorities.length > 0) {
        columnTasks = columnTasks.filter(task =>
          filters.priorities.includes(task.priority)
        )
      }

      // Due date filter
      if (filters.dueDate !== 'all') {
        columnTasks = columnTasks.filter(task => {
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
    }

    // Apply sorting
    if (sort) {
      columnTasks = [...columnTasks].sort((a, b) => {
        let comparison = 0
        switch (sort.by) {
          case 'created':
            comparison = a.createdAt - b.createdAt
            break
          case 'due':
            // Tasks without due dates go to the end
            if (!a.dueDate && !b.dueDate) comparison = 0
            else if (!a.dueDate) comparison = 1
            else if (!b.dueDate) comparison = -1
            else comparison = a.dueDate - b.dueDate
            break
          case 'priority':
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
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

    return columnTasks
  }, [getTasksByColumn, filters, sort])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Don't trigger when modals are open (they handle their own shortcuts)
      if (selectedTask || showArchive || showSearch) {
        return
      }

      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        // Focus on the first column's add card (would need ref)
        // For now, open quick capture
        setShowQuickCapture(true)
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowQuickCapture(true)
      } else if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts(true)
      } else if (e.key === 'a' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowArchive(true)
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTask, showArchive, showSearch])

  // Close shortcuts on any key
  useEffect(() => {
    if (!showShortcuts) return

    const handleKeyDown = () => setShowShortcuts(false)
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showShortcuts])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }, [tasks])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTaskItem = tasks.find(t => t.id === activeId)
    if (!activeTaskItem) return

    const overColumn = COLUMNS.find(c => c.id === overId)
    if (overColumn && activeTaskItem.column !== overColumn.id) {
      moveTask(activeId, overColumn.id)
      return
    }

    const overTask = tasks.find(t => t.id === overId)
    if (overTask && activeTaskItem.column !== overTask.column) {
      moveTask(activeId, overTask.column)
    }
  }, [tasks, moveTask])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTaskItem = tasks.find(t => t.id === activeId)
    const overTask = tasks.find(t => t.id === overId)

    if (!activeTaskItem) return

    // Reordering within the same column
    if (overTask && activeTaskItem.column === overTask.column) {
      const columnTasks = getTasksByColumn(activeTaskItem.column)
      const activeIndex = columnTasks.findIndex(t => t.id === activeId)
      const overIndex = columnTasks.findIndex(t => t.id === overId)

      if (activeIndex === -1 || overIndex === -1) return

      let newOrder: number

      // Moving down (to a later position)
      if (activeIndex < overIndex) {
        // Place after the target
        if (overIndex === columnTasks.length - 1) {
          // Moving to the end
          newOrder = columnTasks[overIndex].order + 1
        } else {
          // Place between target and next
          newOrder = (columnTasks[overIndex].order + columnTasks[overIndex + 1].order) / 2
        }
      } else {
        // Moving up (to an earlier position)
        // Place before the target
        if (overIndex === 0) {
          // Moving to the beginning
          newOrder = columnTasks[0].order - 1
        } else {
          // Place between previous and target
          newOrder = (columnTasks[overIndex - 1].order + columnTasks[overIndex].order) / 2
        }
      }

      moveTask(activeId, activeTaskItem.column, newOrder)
    }
  }, [tasks, getTasksByColumn, moveTask])

  const handleOpenDetail = useCallback((task: KanbanTask) => {
    setSelectedTask(task)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedTask(null)
  }, [])

  const handleMoveTask = useCallback((taskId: string, column: ColumnId) => {
    moveTask(taskId, column)
    // Update selected task if it's the one being moved
    if (selectedTask?.id === taskId) {
      const updated = getTaskById(taskId)
      if (updated) {
        setSelectedTask({ ...updated, column })
      }
    }
  }, [moveTask, selectedTask, getTaskById])

  const handleQuickAdd = useCallback((title: string, priority: KanbanTask['priority']) => {
    addTask(title, 'todo', priority)
  }, [addTask])

  const handleSearchSelect = useCallback((task: KanbanTask) => {
    setSelectedTask(task)
  }, [])

  const archivedTasks = getArchivedTasks()

  // Keep selected task in sync with updates
  useEffect(() => {
    if (selectedTask) {
      const updated = getTaskById(selectedTask.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updated)
      }
    }
  }, [tasks, selectedTask, getTaskById])

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-8 p-8 h-full overflow-x-auto">
          {COLUMNS.map((column, index) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={getFilteredTasksByColumn(column.id)}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
              onUpdateTask={updateTask}
              onOpenDetail={handleOpenDetail}
              index={index}
              accentColor={getColumnColor(column.id)}
              onColorChange={(color) => setColumnColor(column.id, color)}
              compact={compact}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-[var(--bg-secondary)] border-l-2 border-[var(--accent)] shadow-2xl shadow-black/50 rotate-1 scale-[1.02] opacity-95">
              <div className="p-4">
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{activeTask.title}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Archive button */}
      <button
        onClick={() => setShowArchive(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors shadow-lg shadow-black/20"
        title="View archive (A)"
      >
        <Archive size={14} />
        Archive
        {archivedTasks.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-[var(--bg-tertiary)] text-[10px]">
            {archivedTasks.length}
          </span>
        )}
      </button>

      {/* Keyboard hint */}
      <div className="fixed bottom-6 left-6 text-[10px] text-[var(--text-tertiary)]">
        Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border)] mx-1">?</kbd> for shortcuts
      </div>

      {/* Card Detail Modal */}
      {selectedTask && (
        <CardDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={handleCloseDetail}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onArchive={archiveTask}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onToggleLabel={toggleLabel}
          onMoveTask={handleMoveTask}
        />
      )}

      {/* Archive Panel */}
      <ArchivePanel
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        archivedTasks={archivedTasks}
        onRestore={restoreTask}
        onDelete={deleteTask}
      />

      {/* Quick Capture */}
      <QuickCapture
        isOpen={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
        onAdd={handleQuickAdd}
      />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Search */}
      <Search
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={searchTasks}
        onSelectTask={handleSearchSelect}
      />
    </>
  )
}
