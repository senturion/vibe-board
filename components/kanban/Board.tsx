'use client'

import { useCallback, useState, useEffect } from 'react'
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
import { COLUMNS, ColumnId, KanbanTask } from '@/lib/types'
import { useKanban } from '@/hooks/useKanban'
import { Column } from './Column'
import { CardDetailModal } from './CardDetailModal'
import { ArchivePanel } from './ArchivePanel'
import { QuickCapture } from './QuickCapture'
import { KeyboardShortcuts } from './KeyboardShortcuts'

export function Board() {
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
    getTasksByColumn,
    getArchivedTasks,
    getTaskById,
  } = useKanban()

  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [showQuickCapture, setShowQuickCapture] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

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
      if (selectedTask || showArchive) {
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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTask, showArchive])

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
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTaskItem = tasks.find(t => t.id === activeId)
    const overTask = tasks.find(t => t.id === overId)

    if (!activeTaskItem) return

    if (overTask && activeTaskItem.column === overTask.column) {
      const columnTasks = getTasksByColumn(activeTaskItem.column)
      const overIndex = columnTasks.findIndex(t => t.id === overId)
      const newOrder = overIndex === 0
        ? columnTasks[0].order - 1
        : (columnTasks[overIndex - 1].order + columnTasks[overIndex].order) / 2

      moveTask(activeId, activeTaskItem.column, newOrder)
    }
    setActiveTask(null)
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
              tasks={getTasksByColumn(column.id)}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
              onUpdateTask={updateTask}
              onOpenDetail={handleOpenDetail}
              index={index}
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
    </>
  )
}
