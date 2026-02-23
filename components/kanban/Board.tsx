'use client'

import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core'
import { Archive, Plus } from 'lucide-react'
import { COLUMNS, ColumnId, KanbanTask, createColumnId, normalizeColumnTitle } from '@/lib/types'
import { useUndoRedoKanbanActions } from '@/hooks/useUndoRedoKanbanActions'
import { useFilteredTasks } from '@/hooks/useFilteredTasks'
import { useBoardDragAndDrop } from '@/hooks/useBoardDragAndDrop'
import { useBoardKeyboardShortcuts, useCloseOnAnyKey } from '@/hooks/useBoardKeyboardShortcuts'
import { useColumnColors } from '@/hooks/useColumnColors'
import { useSettings } from '@/hooks/useSettings'
import { useBoards } from '@/hooks/useBoards'
import { useStaleTasks } from '@/hooks/useStaleTasks'
import { useTagsContext } from '@/contexts/TagsContext'
import { cn } from '@/lib/utils'
import { KanbanActionsProvider } from '@/contexts/KanbanActionsContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
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
  onFocusTask?: (taskId: string) => void
  focusedTaskId?: string | null
}

export function Board({ boardId = 'default', searchOpen, onSearchClose, filters, sort, compact = false, onFocusTask, focusedTaskId }: BoardProps) {
  const { getColumnColor, setColumnColor } = useColumnColors()
  const { settings, updateSettings } = useSettings()
  const { getTaskTagIdsByTaskIds, taskTagsVersion } = useTagsContext()
  const { boards } = useBoards()
  const boardCustomColumns = useMemo(
    () => settings.boardCustomColumns[boardId] || [],
    [settings.boardCustomColumns, boardId]
  )
  const boardColumnOrder = useMemo(
    () => settings.boardColumnOrder[boardId] || [],
    [settings.boardColumnOrder, boardId]
  )
  const columns = useMemo(() => {
    const columnMap = new Map<string, (typeof COLUMNS)[number]>()
    for (const column of [...COLUMNS, ...boardCustomColumns]) {
      if (!columnMap.has(column.id)) {
        columnMap.set(column.id, column)
      }
    }

    const orderedColumns: (typeof COLUMNS)[number][] = []
    const usedIds = new Set<string>()

    for (const columnId of boardColumnOrder) {
      const column = columnMap.get(columnId)
      if (!column || usedIds.has(column.id)) continue
      orderedColumns.push(column)
      usedIds.add(column.id)
    }

    for (const column of columnMap.values()) {
      if (!usedIds.has(column.id)) {
        orderedColumns.push(column)
      }
    }

    return orderedColumns
  }, [boardCustomColumns, boardColumnOrder])
  const customColumnIdSet = useMemo(
    () => new Set(boardCustomColumns.map((column) => column.id)),
    [boardCustomColumns]
  )

  // Task operations with undo/redo support
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    moveTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    searchTasks,
    getTasksByColumn,
    getArchivedTasks,
    getTaskById,
  } = useUndoRedoKanbanActions(boardId)

  const { staleTaskIds } = useStaleTasks(tasks, boards)

  // Filtering and sorting
  const { getFilteredTasksByColumn } = useFilteredTasks({
    tasks,
    getTasksByColumn,
    getTaskTagIdsByTaskIds,
    taskTagsVersion,
    filters,
    sort,
  })

  // Drag and drop
  const { activeTask, handleDragStart, handleDragOver, handleDragEnd } = useBoardDragAndDrop({
    tasks,
    columns,
    getTasksByColumn,
    moveTask,
  })

  // UI state
  const [activeLane, setActiveLane] = useState<ColumnId>('todo')
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const addColumnInputRef = useRef<HTMLInputElement | null>(null)
  const lanesRef = useRef<HTMLDivElement | null>(null)
  const scrollRafRef = useRef<number | null>(null)
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

  // Keyboard shortcuts
  useBoardKeyboardShortcuts({
    disabled: !!selectedTask || showArchive || showSearch,
    onQuickCapture: () => setShowQuickCapture(true),
    onShowShortcuts: () => setShowShortcuts(true),
    onShowArchive: () => setShowArchive(true),
    onShowSearch: () => setShowSearch(true),
  })

  // Close shortcuts overlay on any key
  useCloseOnAnyKey({
    isOpen: showShortcuts,
    onClose: () => setShowShortcuts(false),
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  const measuring = {
    droppable: { strategy: MeasuringStrategy.Always },
  }

  // Handlers
  const handleOpenDetail = useCallback((task: KanbanTask) => {
    setSelectedTask(task)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedTask(null)
  }, [])

  const handleMoveTask = useCallback((taskId: string, column: ColumnId) => {
    moveTask(taskId, column)
    if (selectedTask?.id === taskId) {
      const updated = getTaskById(taskId)
      if (updated) {
        setSelectedTask({ ...updated, column })
      }
    }
  }, [moveTask, selectedTask, getTaskById])

  const handleQuickAdd = useCallback((title: string, priority: KanbanTask['priority']) => {
    const quickAddColumn = columns.find((column) => column.id === 'todo')?.id || columns[0]?.id || 'todo'
    addTask(title, quickAddColumn, priority)
  }, [addTask, columns])

  const handleSearchSelect = useCallback((task: KanbanTask) => {
    setSelectedTask(task)
  }, [])

  const archivedTasks = getArchivedTasks()

  // Keep selected task in sync with updates
  useEffect(() => {
    if (!selectedTask) return

    const syncTimeout = setTimeout(() => {
      const updated = getTaskById(selectedTask.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updated)
      }
    }, 0)

    return () => clearTimeout(syncTimeout)
  }, [tasks, selectedTask, getTaskById])

  // Active lane scroll tracking
  const updateActiveLaneFromScroll = useCallback(() => {
    const container = lanesRef.current
    if (!container) return
    const containerLeft = container.getBoundingClientRect().left
    let closestLane: ColumnId | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    columns.forEach((column) => {
      const lane = document.getElementById(`lane-${column.id}`)
      if (!lane) return
      const laneLeft = lane.getBoundingClientRect().left
      const distance = Math.abs(laneLeft - containerLeft)
      if (distance < closestDistance) {
        closestDistance = distance
        closestLane = column.id
      }
    })

    if (closestLane && closestLane !== activeLane) {
      setActiveLane(closestLane)
    }
  }, [activeLane, columns])

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRafRef.current !== null) return
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null
        updateActiveLaneFromScroll()
      })
    }
    const container = lanesRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [updateActiveLaneFromScroll])

  useEffect(() => {
    if (addingColumn) {
      addColumnInputRef.current?.focus()
      addColumnInputRef.current?.select()
    }
  }, [addingColumn])

  const persistBoardColumns = useCallback((nextCustomColumns: typeof boardCustomColumns, nextOrder: ColumnId[]) => {
    if (!boardId) return

    const nextCustomMap = { ...settings.boardCustomColumns }
    const nextOrderMap = { ...settings.boardColumnOrder }

    if (nextCustomColumns.length > 0) {
      nextCustomMap[boardId] = nextCustomColumns
    } else {
      delete nextCustomMap[boardId]
    }

    if (nextOrder.length > 0) {
      nextOrderMap[boardId] = nextOrder
    } else {
      delete nextOrderMap[boardId]
    }

    updateSettings({
      boardCustomColumns: nextCustomMap,
      boardColumnOrder: nextOrderMap,
    })
  }, [boardId, settings.boardColumnOrder, settings.boardCustomColumns, updateSettings])

  const handleCreateColumn = useCallback(() => {
    if (!boardId) return
    const normalizedTitle = normalizeColumnTitle(newColumnTitle)
    if (!normalizedTitle) return

    const existingIds = columns.map((column) => column.id)
    const id = createColumnId(normalizedTitle, existingIds)
    const nextCustomColumns = [...boardCustomColumns, { id, title: normalizedTitle }]
    const nextOrder = [...existingIds, id]
    persistBoardColumns(nextCustomColumns, nextOrder)

    setNewColumnTitle('')
    setAddingColumn(false)
    setActiveLane(id)
  }, [boardId, boardCustomColumns, columns, newColumnTitle, persistBoardColumns])

  const handleMoveColumn = useCallback((columnId: ColumnId, direction: -1 | 1) => {
    if (!boardId) return
    const currentOrder = columns.map((column) => column.id)
    const sourceIndex = currentOrder.indexOf(columnId)
    const targetIndex = sourceIndex + direction

    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= currentOrder.length) return

    const nextOrder = [...currentOrder]
    const [column] = nextOrder.splice(sourceIndex, 1)
    nextOrder.splice(targetIndex, 0, column)

    persistBoardColumns(boardCustomColumns, nextOrder)
  }, [boardCustomColumns, boardId, columns, persistBoardColumns])

  const handleRenameColumn = useCallback((columnId: ColumnId, nextTitle: string) => {
    if (!boardId || !customColumnIdSet.has(columnId)) return
    const normalizedTitle = normalizeColumnTitle(nextTitle)
    if (!normalizedTitle) return

    const nextCustomColumns = boardCustomColumns.map((column) =>
      column.id === columnId
        ? { ...column, title: normalizedTitle }
        : column
    )
    const currentOrder = columns.map((column) => column.id)
    persistBoardColumns(nextCustomColumns, currentOrder)
  }, [boardCustomColumns, boardId, columns, customColumnIdSet, persistBoardColumns])

  const handleDeleteColumn = useCallback(async (columnId: ColumnId) => {
    if (!boardId || !customColumnIdSet.has(columnId)) return
    if (!window.confirm('Delete this column? Tasks in it will move to Todo.')) return

    const fallbackColumnId = columns.find((column) => column.id === 'todo' && column.id !== columnId)?.id
      || columns.find((column) => column.id !== columnId)?.id

    if (fallbackColumnId) {
      const tasksInColumn = tasks
        .filter((task) => task.column === columnId)
        .sort((a, b) => a.order - b.order)

      let orderSeed = Date.now()
      for (const task of tasksInColumn) {
        await moveTask(task.id, fallbackColumnId, orderSeed)
        orderSeed += 1
      }
    }

    const nextCustomColumns = boardCustomColumns.filter((column) => column.id !== columnId)
    const nextOrder = columns
      .map((column) => column.id)
      .filter((id) => id !== columnId)

    persistBoardColumns(nextCustomColumns, nextOrder)

    if (activeLane === columnId && fallbackColumnId) {
      setActiveLane(fallbackColumnId)
    }
  }, [activeLane, boardCustomColumns, boardId, columns, customColumnIdSet, moveTask, persistBoardColumns, tasks])

  return (
    <KanbanActionsProvider
      onAddTask={addTask}
      onDeleteTask={deleteTask}
      onUpdateTask={updateTask}
      onToggleSubtask={toggleSubtask}
      onOpenDetail={handleOpenDetail}
      onFocusTask={onFocusTask}
    >
      {/* Mobile lane navigation */}
      <div className="sticky top-0 z-20 flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] lg:hidden overflow-x-auto">
        {columns.map((column) => (
          <button
            key={column.id}
            onClick={() => {
              const lane = document.getElementById(`lane-${column.id}`)
              if (lane) {
                lane.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
                setActiveLane(column.id)
              }
            }}
            className={cn(
              'px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] border transition-colors whitespace-nowrap',
              activeLane === column.id
                ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-glow)]'
                : 'text-[var(--text-tertiary)] border-[var(--border)] hover:text-[var(--text-secondary)]'
            )}
          >
            {column.title}
          </button>
        ))}
        <button
          onClick={() => setAddingColumn(true)}
          disabled={!boardId}
          className="shrink-0 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-1">
            <Plus size={11} />
            Add
          </span>
        </button>
      </div>

      <div className="hidden lg:flex items-center justify-end px-4 sm:px-6 lg:px-8 pt-3">
        <button
          onClick={() => setAddingColumn(true)}
          disabled={!boardId}
          className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-1">
            <Plus size={11} />
            Add Column
          </span>
        </button>
      </div>

      {addingColumn && (
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm">
          <div className="max-w-xl flex items-center gap-2">
            <input
              ref={addColumnInputRef}
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateColumn()
                if (e.key === 'Escape') {
                  setAddingColumn(false)
                  setNewColumnTitle('')
                }
              }}
              placeholder="New column name"
              className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={() => {
                setAddingColumn(false)
                setNewColumnTitle('')
              }}
              className="px-2 py-2 text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateColumn}
              disabled={!boardId || !normalizeColumnTitle(newColumnTitle)}
              className="px-3 py-2 text-[10px] uppercase tracking-[0.1em] bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Board with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={lanesRef}
          className="flex gap-4 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8 min-h-full overflow-x-auto overscroll-x-contain snap-x snap-mandatory sm:snap-none scroll-px-4 sm:scroll-px-0 touch-pan-x sm:touch-auto"
        >
          {columns.map((column, index) => (
            <ErrorBoundary key={column.id} section={column.title}>
              <Column
                id={column.id}
                title={column.title}
                tasks={getFilteredTasksByColumn(column.id)}
                index={index}
                accentColor={getColumnColor(column.id)}
                onColorChange={(color) => setColumnColor(column.id, color)}
                canMoveLeft={index > 0}
                canMoveRight={index < columns.length - 1}
                onMoveLeft={() => handleMoveColumn(column.id, -1)}
                onMoveRight={() => handleMoveColumn(column.id, 1)}
                isCustom={customColumnIdSet.has(column.id)}
                onRename={(nextTitle) => handleRenameColumn(column.id, nextTitle)}
                onDelete={() => {
                  void handleDeleteColumn(column.id)
                }}
                compact={compact}
                focusedTaskId={focusedTaskId}
                staleTaskIds={staleTaskIds}
              />
            </ErrorBoundary>
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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors shadow-lg shadow-black/20"
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
      <div className="hidden sm:block fixed bottom-6 left-6 text-[10px] text-[var(--text-tertiary)]">
        Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border)] mx-1">?</kbd> for shortcuts
      </div>

      {/* Modals */}
      {selectedTask && (
        <CardDetailModal
          task={selectedTask}
          columns={columns}
          isOpen={!!selectedTask}
          onClose={handleCloseDetail}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onArchive={archiveTask}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onMoveTask={handleMoveTask}
          onFocusTask={onFocusTask}
          focusedTaskId={focusedTaskId}
        />
      )}

      <ArchivePanel
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        archivedTasks={archivedTasks}
        onRestore={restoreTask}
        onDelete={deleteTask}
      />

      <QuickCapture
        isOpen={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
        onAdd={handleQuickAdd}
      />

      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <Search
        isOpen={showSearch}
        columns={columns}
        onClose={() => setShowSearch(false)}
        onSearch={searchTasks}
        onSelectTask={handleSearchSelect}
      />
    </KanbanActionsProvider>
  )
}
