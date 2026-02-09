'use client'

import { memo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Check, ChevronLeft, ChevronRight, Edit2, Trash2, X } from 'lucide-react'
import { KanbanTask, ColumnId } from '@/lib/types'
import { useKanbanActions } from '@/contexts/KanbanActionsContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Card } from './Card'
import { CardErrorFallback } from './CardErrorFallback'
import { AddCard } from './AddCard'
import { cn } from '@/lib/utils'
import { COLOR_PALETTE } from '@/hooks/useColumnColors'

interface ColumnProps {
  id: ColumnId
  title: string
  tasks: KanbanTask[]
  index: number
  accentColor: string
  onColorChange: (color: string) => void
  canMoveLeft?: boolean
  canMoveRight?: boolean
  onMoveLeft?: () => void
  onMoveRight?: () => void
  isCustom?: boolean
  onRename?: (title: string) => void
  onDelete?: () => void | Promise<void>
  compact?: boolean
  focusedTaskId?: string | null
}

export const Column = memo(function Column({
  id,
  title,
  tasks,
  index,
  accentColor,
  onColorChange,
  canMoveLeft = false,
  canMoveRight = false,
  onMoveLeft,
  onMoveRight,
  isCustom = false,
  onRename,
  onDelete,
  compact = false,
  focusedTaskId,
}: ColumnProps) {
  const { onAddTask } = useKanbanActions()
  const { setNodeRef, isOver } = useDroppable({ id })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)

  const handleStartRename = () => {
    setDraftTitle(title)
    setIsRenaming(true)
  }

  const handleSaveRename = () => {
    if (!isCustom || !onRename) return
    const normalizedTitle = draftTitle.trim()
    if (!normalizedTitle) return
    onRename(normalizedTitle)
    setIsRenaming(false)
  }

  return (
    <div
      id={`lane-${id}`}
      className="flex flex-col h-full sm:h-auto min-w-[88vw] max-w-[88vw] sm:min-w-[300px] sm:max-w-[300px] animate-fade-up snap-start sm:snap-none"
      style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
    >
      {/* Editorial Column Header */}
      <div className="mb-6 px-1 group">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            {isRenaming && isCustom ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename()
                    if (e.key === 'Escape') {
                      setIsRenaming(false)
                      setDraftTitle(title)
                    }
                  }}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  aria-label="Save column name"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => {
                    setIsRenaming(false)
                    setDraftTitle(title)
                  }}
                  className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  aria-label="Cancel rename"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <h3 className="font-display text-2xl text-[var(--text-primary)] tracking-tight italic truncate">
                {title}
              </h3>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveLeft}
              disabled={!canMoveLeft}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Move ${title} left`}
            >
              <ChevronLeft size={12} />
            </button>
            <button
              onClick={onMoveRight}
              disabled={!canMoveRight}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Move ${title} right`}
            >
              <ChevronRight size={12} />
            </button>
            {isCustom && (
              <>
                <button
                  onClick={handleStartRename}
                  className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  aria-label={`Rename ${title}`}
                >
                  <Edit2 size={11} />
                </button>
                <button
                  onClick={() => { void onDelete?.() }}
                  className="p-1 text-[var(--text-tertiary)] hover:text-red-400"
                  aria-label={`Delete ${title}`}
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mb-1">
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
            aria-label={`Change ${title} column color`}
            aria-haspopup="listbox"
            aria-expanded={showColorPicker}
          />

          {/* Color picker dropdown */}
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColorPicker(false)}
              />
              <div role="listbox" aria-label="Column colors" className="absolute left-0 top-full mt-2 p-2 bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xl shadow-black/30 z-20">
                <div className="grid grid-cols-6 gap-1">
                  {COLOR_PALETTE.map(color => (
                    <button
                      key={color}
                      role="option"
                      aria-selected={accentColor === color}
                      aria-label={color}
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
          'flex-1 flex flex-col gap-3 p-4 rounded-lg transition-all duration-200 min-h-[300px] overflow-y-auto sm:overflow-visible',
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
            <ErrorBoundary key={task.id} section="Card" fallback={<CardErrorFallback taskId={task.id} />}>
              <Card
                task={task}
                index={taskIndex}
                compact={compact}
                accentColor={accentColor}
                focusedTaskId={focusedTaskId}
              />
            </ErrorBoundary>
          ))}
        </SortableContext>

        {/* Ghost card at bottom when column has tasks */}
        {tasks.length > 0 && (
          <AddCard columnId={id} onAdd={onAddTask} />
        )}
      </div>
    </div>
  )
})
