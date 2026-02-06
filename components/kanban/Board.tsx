'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
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
import { Archive } from 'lucide-react'
import { COLUMNS, ColumnId, KanbanTask } from '@/lib/types'
import { useUndoRedoKanbanActions } from '@/hooks/useUndoRedoKanbanActions'
import { useFilteredTasks } from '@/hooks/useFilteredTasks'
import { useBoardDragAndDrop } from '@/hooks/useBoardDragAndDrop'
import { useBoardKeyboardShortcuts, useCloseOnAnyKey } from '@/hooks/useBoardKeyboardShortcuts'
import { useColumnColors } from '@/hooks/useColumnColors'
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
  const { getTaskTagIdsByTaskIds, taskTagsVersion } = useTagsContext()

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
    getTasksByColumn,
    moveTask,
  })

  // UI state
  const [activeLane, setActiveLane] = useState<ColumnId>('todo')
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
    addTask(title, 'todo', priority)
  }, [addTask])

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

    COLUMNS.forEach((column) => {
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
  }, [activeLane])

  useEffect(() => {
    updateActiveLaneFromScroll()
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
        {COLUMNS.map((column) => (
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
      </div>

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
          {COLUMNS.map((column, index) => (
            <ErrorBoundary key={column.id} section={column.title}>
              <Column
                id={column.id}
                title={column.title}
                tasks={getFilteredTasksByColumn(column.id)}
                index={index}
                accentColor={getColumnColor(column.id)}
                onColorChange={(color) => setColumnColor(column.id, color)}
                compact={compact}
                focusedTaskId={focusedTaskId}
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
        onClose={() => setShowSearch(false)}
        onSearch={searchTasks}
        onSelectTask={handleSearchSelect}
      />
    </KanbanActionsProvider>
  )
}
