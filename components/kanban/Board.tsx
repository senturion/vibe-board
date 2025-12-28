'use client'

import { useCallback, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { COLUMNS, ColumnId, KanbanTask } from '@/lib/types'
import { useKanban } from '@/hooks/useKanban'
import { Column } from './Column'
import { Card } from './Card'

export function Board() {
  const { tasks, addTask, updateTask, deleteTask, moveTask, getTasksByColumn } = useKanban()
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }, [tasks])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    // Check if dropping over a column
    const overColumn = COLUMNS.find(c => c.id === overId)
    if (overColumn && activeTask.column !== overColumn.id) {
      moveTask(activeId, overColumn.id)
      return
    }

    // Check if dropping over another task
    const overTask = tasks.find(t => t.id === overId)
    if (overTask && activeTask.column !== overTask.column) {
      moveTask(activeId, overTask.column)
    }
  }, [tasks, moveTask])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTask = tasks.find(t => t.id === activeId)
    const overTask = tasks.find(t => t.id === overId)

    if (!activeTask) return

    // Reorder within the same column
    if (overTask && activeTask.column === overTask.column) {
      const columnTasks = getTasksByColumn(activeTask.column)
      const overIndex = columnTasks.findIndex(t => t.id === overId)
      const newOrder = overIndex === 0
        ? columnTasks[0].order - 1
        : (columnTasks[overIndex - 1].order + columnTasks[overIndex].order) / 2

      moveTask(activeId, activeTask.column, newOrder)
    }
    setActiveTask(null)
  }, [tasks, getTasksByColumn, moveTask])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
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
  )
}
