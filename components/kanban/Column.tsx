'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanTask, ColumnId } from '@/lib/types'
import { Card } from './Card'
import { AddCard } from './AddCard'
import { cn } from '@/lib/utils'
import { COLOR_PALETTE } from '@/hooks/useColumnColors'

interface ColumnProps {
  id: ColumnId
  title: string
  tasks: KanbanTask[]
  onAddTask: (title: string, columnId: ColumnId, priority?: 'low' | 'medium' | 'high' | 'urgent') => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<KanbanTask>) => void
  onOpenDetail: (task: KanbanTask) => void
  index: number
  accentColor: string
  onColorChange: (color: string) => void
  compact?: boolean
}

export function Column({
  id,
  title,
  tasks,
  onAddTask,
  onDeleteTask,
  onUpdateTask,
  onOpenDetail,
  index,
  accentColor,
  onColorChange,
  compact = false,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [showColorPicker, setShowColorPicker] = useState(false)

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
              color: accentColor,
              backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
            }}
          >
            {tasks.length}
          </span>
        </div>
        {/* Color bar - clickable */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="h-0.5 w-12 block hover:h-1 transition-all duration-150 cursor-pointer"
            style={{ backgroundColor: accentColor }}
            title="Change column color"
          />

          {/* Color picker dropdown */}
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColorPicker(false)}
              />
              <div className="absolute left-0 top-full mt-2 p-2 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20">
                <div className="grid grid-cols-6 gap-1">
                  {COLOR_PALETTE.map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        onColorChange(color)
                        setShowColorPicker(false)
                      }}
                      className={cn(
                        'w-6 h-6 rounded-sm transition-transform hover:scale-110',
                        accentColor === color && 'ring-2 ring-white ring-offset-1 ring-offset-[var(--bg-elevated)]'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards Container - Large drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-3 p-4 rounded-lg transition-all duration-200 min-h-[300px]',
          'border-2 border-dashed border-transparent',
          isOver && 'bg-[var(--bg-tertiary)] border-[var(--border)]',
          compact && 'gap-1'
        )}
      >
        {/* Ghost card at top when column is empty */}
        {tasks.length === 0 && (
          <AddCard columnId={id} onAdd={onAddTask} />
        )}

        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, taskIndex) => (
            <Card
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
              onUpdate={onUpdateTask}
              onOpenDetail={onOpenDetail}
              index={taskIndex}
              compact={compact}
              accentColor={accentColor}
            />
          ))}
        </SortableContext>

        {/* Ghost card at bottom when column has tasks */}
        {tasks.length > 0 && (
          <AddCard columnId={id} onAdd={onAddTask} />
        )}
      </div>
    </div>
  )
}
