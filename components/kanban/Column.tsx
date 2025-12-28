'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanTask, ColumnId } from '@/lib/types'
import { Card } from './Card'
import { AddCard } from './AddCard'
import { cn } from '@/lib/utils'

interface ColumnProps {
  id: ColumnId
  title: string
  tasks: KanbanTask[]
  onAddTask: (title: string, columnId: ColumnId, priority?: 'low' | 'medium' | 'high' | 'urgent') => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<KanbanTask>) => void
  onOpenDetail: (task: KanbanTask) => void
  index: number
}

const COLUMN_ACCENTS: Record<ColumnId, string> = {
  'todo': 'var(--accent)',
  'in-progress': 'var(--success)',
  'complete': 'var(--complete)',
}

export function Column({ id, title, tasks, onAddTask, onDeleteTask, onUpdateTask, onOpenDetail, index }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      className="flex flex-col min-w-[300px] max-w-[300px] animate-fade-up"
      style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
    >
      {/* Editorial Column Header */}
      <div className="mb-6 px-1">
        <div className="flex items-baseline gap-3 mb-1">
          <h3 className="font-display text-2xl text-[var(--text-primary)] tracking-tight italic">
            {title}
          </h3>
          <span
            className="text-xs font-medium px-2 py-0.5"
            style={{
              color: COLUMN_ACCENTS[id],
              backgroundColor: `color-mix(in srgb, ${COLUMN_ACCENTS[id]} 10%, transparent)`,
            }}
          >
            {tasks.length}
          </span>
        </div>
        <div
          className="h-0.5 w-12"
          style={{ backgroundColor: COLUMN_ACCENTS[id] }}
        />
      </div>

      {/* Cards Container - Large drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-3 p-4 rounded-lg transition-all duration-200 min-h-[300px]',
          'border-2 border-dashed border-transparent',
          isOver && 'bg-[var(--bg-tertiary)] border-[var(--border)]'
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, taskIndex) => (
            <Card
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
              onUpdate={onUpdateTask}
              onOpenDetail={onOpenDetail}
              index={taskIndex}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
              No tasks yet
            </p>
          </div>
        )}

        <AddCard columnId={id} onAdd={onAddTask} />
      </div>
    </div>
  )
}
